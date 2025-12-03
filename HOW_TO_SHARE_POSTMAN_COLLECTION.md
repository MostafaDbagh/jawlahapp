# How to Share Postman Collection with Your Friend

## 📤 Ways to Share

### Option 1: Share the JSON File (Easiest)
1. **Send the file directly:**
   - Share `JWALA_API_POSTMAN_COLLECTION.json` or `NEW_FEATURES_POSTMAN_COLLECTION.json`
   - Via email, messaging app, cloud storage (Google Drive, Dropbox), or GitHub

2. **Your friend imports it:**
   - Open Postman
   - Click **Import** button
   - Select **File** tab
   - Choose the JSON file you sent
   - Click **Import**

### Option 2: Share via Postman Cloud (Recommended for Teams)
1. **Export to Postman Cloud:**
   - In Postman, open the collection
   - Click the **three dots** (⋯) next to collection name
   - Select **Share collection**
   - Choose **Share via link** or **Invite team members**
   - Copy the link and share it

2. **Your friend imports:**
   - Click the shared link, or
   - In Postman: **Import** → **Link** → Paste the URL

### Option 3: Share via GitHub/Git Repository
1. **Commit the file to your repo:**
   ```bash
   git add JWALA_API_POSTMAN_COLLECTION.json
   git commit -m "Add Postman collection"
   git push
   ```

2. **Your friend downloads:**
   - Clone/pull the repository, or
   - Download the file directly from GitHub

---

## 📋 Instructions for Your Friend

### Step 1: Import the Collection
1. Open Postman (download from [postman.com](https://www.postman.com/downloads/) if needed)
2. Click **Import** button (top left)
3. Choose one of these methods:
   - **File**: Select the JSON file you received
   - **Link**: Paste a Postman share link
   - **Raw text**: Paste the JSON content

### Step 2: Configure Variables
After importing, configure these variables:

1. **Click on the collection name** in the left sidebar
2. Click the **Variables** tab
3. Set these values:

   | Variable | Value | Description |
   |----------|-------|-------------|
   | `baseUrl` | `http://localhost:5000` | Your API server URL (or production URL) |
   | `phone` | `+1234567890` | Phone number for testing |
   | `fcmToken` | `your-firebase-token` | FCM token (optional, for push notifications) |

### Step 3: Test the APIs

#### For Phone Login:
1. Go to **Authentication** → **Request OTP for Phone Login**
2. Update the `phone` variable if needed
3. Send the request
4. Check server logs for the OTP code
5. Go to **Authentication** → **Verify OTP and Login**
6. Set the `otp` variable with the code from server logs
7. Send request - access token will be auto-saved! ✅

#### For Protected Endpoints:
- The access token is automatically saved after login
- All protected endpoints (FCM Token, Notifications) will use it automatically

---

## 🔐 Important Notes for Sharing

### What's Safe to Share:
✅ **Safe:**
- Collection structure and endpoints
- Request examples
- Test scripts
- Variable names (not values)

### What to NOT Share:
❌ **Don't Share:**
- Real access tokens
- Real API keys
- Production database credentials
- Personal phone numbers (use test numbers)

### Best Practice:
- Use **test/example values** in the collection
- Your friend should update variables with their own values
- For production, use Postman Environments to separate dev/prod configs

---

## 🚀 Quick Start for Your Friend

1. **Import collection** → Done! ✅
2. **Set `baseUrl`** → Point to your API server
3. **Request OTP** → Get OTP from server logs
4. **Verify OTP** → Login and get token
5. **Test other endpoints** → Token is auto-saved!

---

## 📱 Alternative: Share via Postman Workspace

If you both have Postman accounts:

1. **Create a Postman Workspace:**
   - In Postman, click **Workspaces** → **Create Workspace**
   - Choose **Team** or **Personal**
   - Name it (e.g., "Jwalah App API")

2. **Add Collection to Workspace:**
   - Drag the collection into the workspace

3. **Invite Your Friend:**
   - Click **Invite** button in workspace
   - Enter their email
   - They'll get an invitation

4. **Your Friend:**
   - Accepts invitation
   - Collection appears automatically
   - Can collaborate in real-time!

---

## ✅ Checklist for Sharing

- [ ] Choose sharing method (file, link, or workspace)
- [ ] Remove any sensitive data from collection
- [ ] Use test/example values in variables
- [ ] Share the collection file/link
- [ ] Share this guide with your friend
- [ ] Provide API server URL (if different from default)
- [ ] Explain how to get OTP from server logs

---

**That's it! Your friend can now use the Postman collection to test all your APIs! 🎉**

