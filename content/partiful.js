(() => {
  const processedForms = new WeakSet();
  const processedModals = new WeakSet();
  let settings = null;
  let automationReported = false;
  let fillTracker = null;

  const init = async () => {
    console.log('[Partiful Auto Apply] Content script initialized on:', window.location.href);
    settings = await fetchSettings();
    console.log('[Partiful Auto Apply] Settings loaded:', settings);
    fillTracker = createFillTracker();
    
    // Wait for page to fully load
    if (document.readyState === 'loading') {
      console.log('[Partiful Auto Apply] Waiting for page to load...');
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    
    console.log('[Partiful Auto Apply] Page loaded, starting observation');
    observeDom();
    
    // Initial scan after a brief delay to let React render
    setTimeout(() => {
      console.log('[Partiful Auto Apply] Running initial scan');
      scan();
    }, 1000);
    
    setTimeout(() => {
      if (!automationReported && settings && settings.automation?.status === 'running') {
        const hasActivity = fillTracker.rsvpChoice || fillTracker.questionsFilled > 0;
        if (!hasActivity) {
          console.log('[Partiful Auto Apply] Timeout - no activity detected');
          fillTracker.details.push('Timeout: No RSVP button or questionnaire found');
          notifyAutomation('No action taken - event may have unusual layout', { closeTab: true });
        }
      }
    }, 6000);
  };

  function createFillTracker() {
    return {
      rsvpChoice: false,
      rsvpAttendee: false,
      rsvpComment: false,
      questionsFilled: 0,
      questionsSkipped: 0,
      questionsFailed: 0,
      dropdownsFailed: [],
      details: []
    };
  }

  async function fetchSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'settings:get' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Failed to fetch settings', chrome.runtime.lastError);
          resolve(createEmptySettings());
        } else {
          resolve(response?.settings || createEmptySettings());
        }
      });
    });
  }

  function createEmptySettings() {
    return {
      profile: {
        email: '',
        fullName: '',
        linkedin: '',
        company: '',
        industry: '',
        startupBlurb: '',
        achievement: '',
        ask: '',
        rsvpComment: ''
      },
      dropdowns: getDefaultDropdownRules(),
      questions: getDefaultQuestionRules(),
      rsvp: {
        choice: 'going',
        attendeeLabel: '1 attendee',
        autoSubmit: false,
        submitDelay: 1000,
        includeComment: false
      },
      automation: {
        eventList: [],
        maxConcurrent: 1,
        visitDuration: 5000,
        status: 'idle',
        progress: [],
        log: []
      }
    };
  }

  function getDefaultDropdownRules() {
    return [
      {
        id: 'job-title',
        title: 'Job title',
        matchers: ['what is your job title', 'job title'],
        preferred: '',
        fallbacks: []
      },
      {
        id: 'stage',
        title: 'Stage',
        matchers: ['what stage', 'stage?'],
        preferred: '',
        fallbacks: []
      },
      {
        id: 'fundraising',
        title: 'Raised / ticket size',
        matchers: ['how much have you raised', 'ticket size'],
        preferred: '',
        fallbacks: []
      },
      {
        id: 'arr',
        title: 'ARR',
        matchers: ['arr', 'annual recurring revenue'],
        preferred: '',
        fallbacks: []
      },
      {
        id: 'volunteer',
        title: 'Volunteer interest',
        matchers: ['volunteer', 'help with this event'],
        preferred: '',
        fallbacks: []
      },
      {
        id: 'sponsor',
        title: 'Sponsorship interest',
        matchers: ['sponsor this event', 'sponsoring this event'],
        preferred: '',
        fallbacks: []
      },
      {
        id: 'host-linkedin',
        title: 'Add host on LinkedIn',
        matchers: ['please add me linkedin', 'add me linkedin', 'approval rate'],
        preferred: '',
        fallbacks: []
      },
      {
        id: 'ticket-purchase',
        title: 'Ticket purchase acknowledgement',
        matchers: ['people who purchase tickets'],
        preferred: '',
        fallbacks: []
      },
      {
        id: 'follow-linkedin',
        title: 'Follow on LinkedIn',
        matchers: ['are you following us on linkedin'],
        preferred: '',
        fallbacks: []
      }
    ];
  }

  function getDefaultQuestionRules() {
    return [
      {
        id: 'nachonacho',
        matchType: 'contains',
        pattern: 'nachonacho.com',
        answerType: 'text',
        value: ''
      },
      {
        id: 'whatsapp-group',
        matchType: 'contains',
        pattern: 'whatsapp group',
        answerType: 'text',
        value: ''
      },
      {
        id: 'raised-capital',
        matchType: 'contains',
        pattern: 'have you raised capital',
        answerType: 'text',
        value: ''
      }
    ];
  }

  function observeDom() {
    const observer = new MutationObserver(() => {
      scan();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function scan() {
    tryOpenRsvpModal();
    tryHandleRsvpModal();
    tryHandleQuestionnaire();
  }

  function tryOpenRsvpModal() {
    const modal = document.querySelector('#guest-rsvp-dialog');
    if (modal) return;
    
    if (processedModals.has(document.body)) return;
    
    console.log('[Partiful Auto Apply] Searching for RSVP button...');
    
    // Try multiple methods to find RSVP button
    let rsvpButton = null;
    
    // Method 1: Search by text
    const buttonTexts = ['RSVP', 'Respond', "I'm Going", 'Join', 'Reply', 'Get on the list'];
    for (const text of buttonTexts) {
      rsvpButton = findElementByText(
        document.body, 
        ['button', '[role="button"]', 'a'], 
        text
      );
      if (rsvpButton) {
        console.log(`[Partiful Auto Apply] Found button with text: ${text}`);
        break;
      }
    }
    
    // Method 2: Search by partial class name, as text can fail
    if (!rsvpButton) {
      rsvpButton = document.querySelector('[class*="EventPage_rsvpSection"] button') || document.querySelector('[class*="RsvpActions_singleButton"]');
      if (rsvpButton) {
        console.log('[Partiful Auto Apply] Found button via partial class name search.');
      }
    }

    // Method 3: Fallback search for any button containing "rsvp"
    if (!rsvpButton) {
      const allButtons = document.querySelectorAll('button, [role="button"], a');
      rsvpButton = Array.from(allButtons).find(btn => 
        (btn.textContent || '').toLowerCase().includes('rsvp') || 
        (btn.getAttribute('aria-label') || '').toLowerCase().includes('rsvp')
      );
      if (rsvpButton) {
        console.log('[Partiful Auto Apply] Found button via generic contains search');
      }
    }
    
    if (rsvpButton && isElementVisible(rsvpButton)) {
      console.log('[Partiful Auto Apply] Clicking RSVP button:', rsvpButton.textContent.trim());
      
      // Visual confirmation for debugging
      rsvpButton.style.border = '3px dashed red';
      rsvpButton.style.backgroundColor = '#ffcccc';
      
      fillTracker.details.push('Clicking RSVP button to open modal');
      
      setTimeout(() => {
        rsvpButton.click();
        processedModals.add(document.body);
        setTimeout(() => scan(), 500);
      }, 200); // Short delay to make the highlight visible

    } else if (!rsvpButton) {
      console.log('[Partiful Auto Apply] No RSVP button found on page');
      console.log('[Partiful Auto Apply] Page buttons:', Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()));
    } else {
      console.log('[Partiful Auto Apply] RSVP button found but not visible');
    }
  }

  function tryHandleRsvpModal() {
    const modal = document.querySelector('#guest-rsvp-dialog');
    if (!modal || processedModals.has(modal)) return;
    if (!settings) return;
    handleRsvpModal(modal);
    processedModals.add(modal);
  }

  function handleRsvpModal(modal) {
    console.log('[Partiful Auto Apply] RSVP modal detected, filling form');
    const choiceLabel = settings.rsvp.choice === 'cant_go' ? "Can't Go" : 'Going';
    const choiceButton = findElementByText(modal, ['button', '[role="button"]'], choiceLabel);
    if (choiceButton) {
      console.log(`[Partiful Auto Apply] Clicking RSVP choice: ${choiceLabel}`);
      choiceButton.click();
      fillTracker.rsvpChoice = true;
      fillTracker.details.push(`Selected RSVP: ${choiceLabel}`);
    } else {
      console.log(`[Partiful Auto Apply] RSVP button not found: ${choiceLabel}`);
      fillTracker.details.push(`Failed to find RSVP button: ${choiceLabel}`);
    }

    if (settings.rsvp.attendeeLabel) {
      const attendeeButton = findElementByText(modal, ['button'], settings.rsvp.attendeeLabel);
      if (attendeeButton) {
        attendeeButton.click();
        fillTracker.rsvpAttendee = true;
        fillTracker.details.push(`Selected attendee: ${settings.rsvp.attendeeLabel}`);
      } else {
        fillTracker.details.push(`Could not find attendee option: ${settings.rsvp.attendeeLabel}`);
      }
    }

    if (settings.rsvp.includeComment && settings.profile.rsvpComment) {
      const commentInput = modal.querySelector('textarea, input[type="text"]');
      if (commentInput) {
        const success = setInputValue(commentInput, settings.profile.rsvpComment);
        if (success) {
          fillTracker.rsvpComment = true;
          fillTracker.details.push('Added RSVP comment');
        }
      }
    }

    const continueButton = findElementByText(modal, ['button[type="submit"]', 'button'], 'Continue');
    if (continueButton && settings.rsvp.autoSubmit) {
      setTimeout(() => {
        continueButton.click();
        awaitQuestionnaire(4000).then((found) => {
          if (!found) {
            notifyAutomation('RSVP submitted automatically (no questionnaire).', { closeTab: true });
          }
        });
      }, settings.rsvp.submitDelay || 0);
    } else if (!document.querySelector('form[name="questionnaire"]')) {
      notifyAutomation('RSVP prepared (no questionnaire).', { closeTab: settings.rsvp.autoSubmit });
    }
  }

  function tryHandleQuestionnaire() {
    const forms = document.querySelectorAll('form[name="questionnaire"]');
    forms.forEach((form) => {
      if (processedForms.has(form)) return;
      if (!settings) return;
      fillQuestionnaire(form);
      processedForms.add(form);
    });
  }

  function fillQuestionnaire(form) {
    const questions = form.querySelectorAll('.QuestionnaireForm_question__gsqZj, [data-testid="question"]');
    console.log(`[Partiful Auto Apply] Questionnaire detected with ${questions.length} questions`);
    questions.forEach((question) => {
      const label = extractLabelText(question);
      if (!label) {
        fillTracker.questionsSkipped++;
        return;
      }
      const control = question.querySelector('input, textarea, button');
      if (!control) {
        fillTracker.questionsSkipped++;
        fillTracker.details.push(`Skipped "${label}" - no control found`);
        return;
      }

      const response = resolveResponse(label, control);
      if (!response) {
        fillTracker.questionsSkipped++;
        fillTracker.details.push(`Skipped "${label}" - no matching data`);
        return;
      }

      if (response.type === 'text') {
        const input = question.querySelector('input, textarea');
        if (input) {
          const success = setInputValue(input, response.value);
          if (success) {
            fillTracker.questionsFilled++;
            fillTracker.details.push(`Filled "${label}" with "${response.value}"`);
          } else {
            fillTracker.questionsFailed++;
            fillTracker.details.push(`Failed to fill "${label}"`);
          }
        }
      } else if (response.type === 'dropdown') {
        const button = question.querySelector('button');
        if (button) {
          selectDropdownValue(button, response.value, response.fallbacks || [], (success, selected) => {
            if (success) {
              fillTracker.questionsFilled++;
              fillTracker.details.push(`Selected "${selected}" for "${label}"`);
            } else {
              fillTracker.questionsFailed++;
              fillTracker.dropdownsFailed.push(label);
              fillTracker.details.push(`Failed to find dropdown option for "${label}"`);
            }
          });
        }
      }
    });

    const submitButton = form.querySelector('button[type="submit"], .QuestionnaireForm_actions__ZsgbP button[type="submit"]');
    if (submitButton && settings.rsvp.autoSubmit) {
      setTimeout(() => {
        submitButton.click();
        notifyAutomation('Questionnaire submitted automatically.', { closeTab: true });
      }, settings.rsvp.submitDelay || 0);
    } else {
      notifyAutomation('Questionnaire prepared for review.', { closeTab: false });
    }
  }

  function extractLabelText(question) {
    const label = question.querySelector('span');
    if (!label) return '';
    return label.textContent.replace(/\s+/g, ' ').trim();
  }

  function resolveResponse(label, control) {
    const normalized = label.toLowerCase();
    console.log(`[Partiful Auto Apply] Resolving response for question: "${label}"`);

    const custom = findCustomRule(label, normalized);
    if (custom) {
      console.log(`[Partiful Auto Apply] Matched custom rule:`, custom);
      return custom;
    }

    const fromDropdown = findDropdownRule(label, normalized);
    if (fromDropdown) {
      console.log(`[Partiful Auto Apply] Matched dropdown rule:`, fromDropdown);
      return fromDropdown;
    }

    const profileValue = mapProfileValue(normalized);
    if (profileValue) {
      console.log(`[Partiful Auto Apply] Matched profile field:`, profileValue);
      return { type: 'text', value: profileValue };
    }

    if (control.matches('input[type="email"]') && settings.profile.email) {
      console.log(`[Partiful Auto Apply] Detected email field`);
      return { type: 'text', value: settings.profile.email };
    }

    console.log(`[Partiful Auto Apply] No match found for: "${label}"`);
    return null;
  }

  function findCustomRule(label, normalized) {
    for (const rule of settings.questions || []) {
      if (!rule.pattern) continue;
      const pattern = rule.pattern.toLowerCase();
      let matches = false;
      if (rule.matchType === 'exact' && normalized === pattern) {
        matches = true;
      } else if (rule.matchType === 'contains' && normalized.includes(pattern)) {
        matches = true;
      } else if (rule.matchType === 'regex') {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          matches = regex.test(label);
        } catch (error) {
          console.warn('Invalid regex pattern', rule.pattern, error);
        }
      }
      if (matches) {
        return {
          type: rule.answerType === 'dropdown' ? 'dropdown' : 'text',
          value: rule.value,
          fallbacks: []
        };
      }
    }
    return null;
  }

  function findDropdownRule(label, normalized) {
    console.log(`[Partiful Auto Apply] Checking ${settings.dropdowns?.length || 0} dropdown rules for: "${label}"`);
    for (const rule of settings.dropdowns || []) {
      const matchers = rule.matchers || [];
      console.log(`[Partiful Auto Apply] Checking rule "${rule.title}" with matchers:`, matchers);
      if (matchers.some((matcher) => normalized.includes(matcher.toLowerCase()))) {
        console.log(`[Partiful Auto Apply] MATCH! Rule "${rule.title}" matched. Preferred: "${rule.preferred}", Fallbacks:`, rule.fallbacks);
        if (rule.preferred) {
          return {
            type: 'dropdown',
            value: rule.preferred,
            fallbacks: rule.fallbacks || []
          };
        } else {
          console.log(`[Partiful Auto Apply] WARNING: Rule matched but no preferred value set`);
        }
      }
    }
    console.log(`[Partiful Auto Apply] No dropdown rule matched`);
    return null;
  }

  function mapProfileValue(normalizedLabel) {
    if (normalizedLabel.includes('email')) return settings.profile.email;
    if (normalizedLabel.includes('full name') || normalizedLabel.includes('name?') || normalizedLabel.endsWith('name *')) {
      return settings.profile.fullName;
    }
    if (normalizedLabel.includes('linkedin')) return settings.profile.linkedin;
    if (normalizedLabel.includes('company')) return settings.profile.company;
    if (normalizedLabel.includes('industry')) return settings.profile.industry;
    if (normalizedLabel.includes('describe your startup')) return settings.profile.startupBlurb;
    if (normalizedLabel.includes('achievement')) return settings.profile.achievement;
    if (normalizedLabel.includes('looking for')) return settings.profile.ask;
    if (normalizedLabel.includes('comment')) return settings.profile.rsvpComment;
    return '';
  }

  function setInputValue(input, value) {
    const previous = input.value;
    if (previous === value) return true;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return input.value === value;
  }

  function selectDropdownValue(button, preferred, fallbacks, callback) {
    button.click();
    const candidates = [preferred, ...fallbacks].filter(Boolean);

    if (!candidates.length) {
      document.body.click();
      if (callback) callback(false, null);
      return;
    }

    const openDeadline = Date.now() + 1000;
    const selectDeadline = Date.now() + 3000;
    let dropdownOpened = false;
    let selectedValue = null;

    const waitForDropdownOpen = () => {
      const container = locateDropdownContainer(button);
      if (container) {
        const options = container.querySelectorAll('li, button, [role="option"]');
        if (options.length > 0) {
          dropdownOpened = true;
          setTimeout(() => trySelect(), 50);
          return;
        }
      }
      if (Date.now() < openDeadline) {
        setTimeout(waitForDropdownOpen, 50);
      } else {
        setTimeout(() => trySelect(), 50);
      }
    };

    const trySelect = () => {
      const container = locateDropdownContainer(button) || document.body;
      for (const candidate of candidates) {
        const option = findElementByText(container, ['li', 'button', '[role="option"]'], candidate);
        if (option && isElementVisible(option)) {
          option.click();
          selectedValue = candidate;
          if (callback) callback(true, selectedValue);
          return true;
        }
      }
      if (Date.now() < selectDeadline) {
        setTimeout(trySelect, 100);
      } else {
        document.body.click();
        if (callback) callback(false, null);
      }
      return false;
    };

    waitForDropdownOpen();
  }

  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
  }

  function locateDropdownContainer(button) {
    const popups = document.querySelectorAll('[role="listbox"], .ptf-munu-[data-open="true"]');
    if (popups.length) {
      return popups[popups.length - 1];
    }
    let parent = button.parentElement;
    for (let depth = 0; depth < 5 && parent; depth += 1) {
      const list = parent.querySelector('[role="listbox"], ul');
      if (list) return list;
      parent = parent.parentElement;
    }
    return document.body;
  }

  function findElementByText(root, selectors, targetText) {
    if (!root || !targetText) return null;
    const text = targetText.replace(/\s+/g, ' ').trim().toLowerCase();
    const elements = selectors.flatMap((selector) => Array.from(root.querySelectorAll(selector)));
    
    const normalize = (str) => str.replace(/\s+/g, ' ').trim().toLowerCase();

    return (
      elements.find((el) => normalize(el.textContent) === text) ||
      elements.find((el) => normalize(el.textContent).includes(text)) ||
      null
    );
  }

  function awaitQuestionnaire(timeout = 4000) {
    return new Promise((resolve) => {
      const end = Date.now() + timeout;
      const check = () => {
        if (document.querySelector('form[name="questionnaire"]')) {
          resolve(true);
        } else if (Date.now() > end) {
          resolve(false);
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }

  function notifyAutomation(detail, options = {}) {
    if (!settings || settings.automation?.status !== 'running') return;
    if (automationReported) return;
    automationReported = true;

    const totalFilled = fillTracker.questionsFilled + (fillTracker.rsvpChoice ? 1 : 0);
    const hasCriticalFailure = !fillTracker.rsvpChoice || fillTracker.questionsFailed > 0;
    const success = totalFilled > 0 && !hasCriticalFailure;

    const summaryDetail = [
      detail,
      `Filled: ${fillTracker.questionsFilled} questions`,
      `Skipped: ${fillTracker.questionsSkipped}`,
      fillTracker.questionsFailed > 0 ? `Failed: ${fillTracker.questionsFailed}` : null,
      fillTracker.dropdownsFailed.length > 0 ? `Missing dropdowns: ${fillTracker.dropdownsFailed.join(', ')}` : null
    ].filter(Boolean).join(' | ');

    chrome.runtime.sendMessage({
      type: 'automation:itemComplete',
      success,
      detail: summaryDetail,
      debugDetails: fillTracker.details,
      closeTab: options.closeTab
    }, () => void chrome.runtime.lastError);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'automation:execute') {
      init();
    }
  });

  // Run immediately for manual visits.
  init();
})();
