# How to See If The Extension Is Actually Working

## Problem: Tabs Open and Close Too Fast!

You're right - the tabs open in the background and close in 2-3 seconds, so you can't see if anything is being filled.

## ✅ NEW DEBUG FEATURES (Just Added!)

I've added two new options to help you see what's happening:

### Option 1: Make Tabs Visible ✓
- **What it does:** Opens tabs in the foreground so you can watch the form being filled in real-time
- **When to use:** When you want to SEE the extension clicking and filling

### Option 2: Keep Tabs Open ✓
- **What it does:** Keeps tabs open after completion instead of closing them
- **When to use:** When you want to inspect the filled form after automation completes

### Option 3: Console Logging ✓
- **What it does:** Prints detailed logs to browser console
- **When to use:** For technical debugging

---

## 🎯 HOW TO DEBUG - Step by Step

### Method 1: Watch It Live (Easiest)

1. **Open Extension Settings**
   - Right-click extension → Options

2. **Go to Automation Queue Section**
   - Scroll down to the automation settings

3. **Enable Debug Options:**
   - ☑️ **Check "Make tabs visible"** (so you can watch)
   - ☑️ **Check "Keep tabs open"** (so tabs don't close)
   - Click **"Save automation settings"**

4. **Add ONE Test Event:**
   - Paste a single Partiful event URL
   - Click **"Save automation settings"**

5. **Start Automation:**
   - Click **"Start queue"**

6. **WATCH:**
   - You'll see a new tab open in the foreground
   - Watch for:
     - ✅ RSVP button clicking
     - ✅ Modal opening
     - ✅ "Going" being selected
     - ✅ Form fields being filled
     - ✅ Continue button clicking
   - Tab stays open so you can verify the filled form!

7. **Check the Automation Log:**
   - Go back to the options page
   - Scroll to automation log section
   - You should see detailed messages like:
   ```
   Starting automation for 1 event(s)
   Debug mode: Tabs will be visible so you can watch the filling
   Debug mode: Tabs will stay open after completion
   Opened tab 123 for https://...
   Clicking RSVP button to open modal
   Selected RSVP: Going
   Filled "Job title" with "Founder"
   Filled "Company" with "MyStartup"
   Tab 123 completed: Filled 8 questions | Skipped 2
   Tab 123 kept open for inspection (debug mode)
   ```

---

### Method 2: Browser Console (For Technical Debugging)

1. **Start Automation with ONE event** (with visible tabs enabled)

2. **When tab opens, immediately:**
   - Press **F12** or **Cmd+Option+I** (Mac) to open DevTools
   - Click **"Console"** tab

3. **Look for green messages:**
   ```
   [Partiful Auto Apply] Content script initialized
   [Partiful Auto Apply] Settings loaded: {profile: {...}, ...}
   [Partiful Auto Apply] Found RSVP button, clicking to open modal
   [Partiful Auto Apply] RSVP modal detected, filling form
   [Partiful Auto Apply] Clicking RSVP choice: Going
   [Partiful Auto Apply] Questionnaire detected with 8 questions
   ```

4. **If you see errors (red text):**
   - Take a screenshot
   - Check what the error says

---

### Method 3: Check the Automation Log

Even without visual inspection, the automation log tells you EXACTLY what happened:

1. **Go to Extension Options**
2. **Scroll to bottom** (Automation Controls section)
3. **Look at the log messages**

#### What Success Looks Like:
```
12:30:45 • Starting automation for 1 event(s)
12:30:46 • Opened tab 123 for https://partiful.com/e/abc123
12:30:51 • Tab 123 completed: Questionnaire submitted | Filled: 8 questions | Skipped: 2
```

#### What Failure Looks Like:
```
12:30:45 • Starting automation for 1 event(s)
12:30:46 • Opened tab 123 for https://partiful.com/e/abc123
12:30:50 • Tab 123 failed: No action taken - event may have unusual layout
12:30:51 • Tab 123 failed, will retry (attempt 1/3)
```

---

## 🔍 What To Look For

### ✅ Working Correctly:

**Visual indicators (when tabs are visible):**
- ✅ Tab opens
- ✅ Page loads Partiful event
- ✅ RSVP button is clicked (you see modal appear)
- ✅ "Going" button is clicked in modal
- ✅ Attendee count is selected
- ✅ Form fields fill with your data (name, email, company, etc.)
- ✅ "Continue" button is clicked
- ✅ Questionnaire appears and fills
- ✅ "Submit" button is clicked

**Log indicators:**
```
✅ Clicking RSVP button to open modal
✅ Selected RSVP: Going
✅ Selected attendee: 1 attendee
✅ Filled "Job title" with "Founder"
✅ Filled "Company" with "MyStartup"
✅ Completed: Questionnaire submitted | Filled: 8 questions | Skipped: 2
```

### ❌ Not Working - Common Issues:

**1. No RSVP button found**
```
❌ No RSVP button found on page
❌ Timeout: No RSVP button or questionnaire found
```
**Possible causes:**
- Already RSVP'd to this event
- Event is closed/past
- Need to log in to Partiful first
- Event URL is wrong

**2. RSVP button found but nothing fills**
```
✅ Clicking RSVP button to open modal
❌ Timeout - no activity detected
```
**Possible causes:**
- Modal didn't open (timing issue)
- Wrong modal selector
- Need to increase "Stay duration" setting

**3. Questions being skipped**
```
✅ Completed: Filled 2 questions | Skipped: 8
```
**Possible causes:**
- Profile fields not filled in settings
- Dropdown preferences don't match exact option text
- Need to add custom question rules

---

## 🧪 Testing Checklist

### Before Running Full Batch:

1. ☑️ **Check settings are saved:**
   - Profile fields filled
   - Dropdown preferences configured
   - "Auto-click Continue" is ON

2. ☑️ **Enable debug mode:**
   - "Make tabs visible" checked
   - "Keep tabs open" checked
   - Saved

3. ☑️ **Test with ONE event:**
   - Watch tab open and fill
   - Check automation log
   - Verify form was submitted

4. ☑️ **Manual verification:**
   - Go to the event URL manually
   - Check if your RSVP was recorded

5. ☑️ **If test succeeds:**
   - Disable "Keep tabs open" (optional)
   - Disable "Make tabs visible" for faster processing (optional)
   - Run full batch!

---

## 📊 What Each Setting Does

### Max concurrent tabs: 1-5
- **1 = Safest** (process one at a time, easier to debug)
- **2-5 = Faster** (multiple events simultaneously, harder to watch)
- **Recommendation:** Use 1 for debugging, increase after it's working

### Open tab stay duration: 5000ms (5 seconds)
- How long to keep tab open before timeout
- **If forms load slowly:** Increase to 7000-10000ms
- **If forms load fast:** Can keep at 5000ms

### Make tabs visible
- **ON:** You can watch the filling happen (slower, uses more resources)
- **OFF:** Tabs open in background (faster, can't see what's happening)
- **Recommendation:** ON for first test, OFF for batch processing

### Keep tabs open
- **ON:** Tabs stay open for manual inspection (useful for debugging)
- **OFF:** Tabs close automatically after completion (normal mode)
- **Recommendation:** ON for debugging, OFF for production

---

## 🚨 Troubleshooting Quick Fixes

### "I don't see anything happening"
→ Enable "Make tabs visible" and run 1 event

### "Tabs open and close immediately"
→ Check automation log - it tells you why (usually "no RSVP button found")

### "Console shows 'Content script initialized' but nothing else"
→ The RSVP button might not be found, check the page manually

### "Forms aren't being filled"
→ Enable "Keep tabs open" and inspect what's missing in the form

### "It worked once, now it doesn't"
→ You might have already RSVP'd to those events

### "Everything skipped"
→ Check your profile settings and dropdown preferences are saved

---

## ✅ Final Verification

After enabling debug mode and running ONE test event, you should be able to answer:

1. ✅ Did I see a tab open?
2. ✅ Did I see the RSVP button get clicked?
3. ✅ Did I see the modal open?
4. ✅ Did I see "Going" get selected?
5. ✅ Did I see form fields fill with my data?
6. ✅ Did I see the form submit?
7. ✅ Does the automation log show "Completed: Filled X questions"?

**If YES to all 7** → Extension is working! Disable debug options and run full batch.

**If NO to any** → Check which step failed, look at console errors, review settings.

---

## 🎬 Ready to Test!

1. **Update the extension** in Chrome (`chrome://extensions/` → refresh)
2. **Enable both debug checkboxes** in settings
3. **Add ONE test event**
4. **Click "Start queue"**
5. **WATCH the tab** - you'll now see everything happen!
6. **Check the log** for detailed results

You'll now have full visibility into what the extension is doing! 🎉
