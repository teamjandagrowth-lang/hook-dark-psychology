# Hook Dark Psychology: setup

This folder is the whole site:

- `index.html` is the app.
- `netlify/edge-functions/ai.js` is the AI connection. It keeps your key hidden from visitors.

It runs on Netlify's free plan and Google's free Gemini API, with no credit card needed.

## 1. Get a free Gemini API key (2 minutes)
1. Go to https://aistudio.google.com/apikey and sign in with a Google account.
2. Click **Create API key** and copy it.

## 2. Put the folder on GitHub
Netlify Drop (drag and drop) can't run the AI part, so the site goes up through GitHub instead.
1. Create a free account at https://github.com.
2. Click **New repository**, name it `hook-dark-psychology`, and click **Create repository**.
3. Click **uploading an existing file**, then drag in everything in this folder: `index.html`, `README.md` and the `netlify` folder.
4. Click **Commit changes**.

## 3. Connect it to Netlify
1. In Netlify, go to **Add new project → Import an existing project → GitHub**, and choose the repository.
2. Leave the build settings empty and click **Deploy**.
3. Go to **Project configuration → Environment variables** and add:
   - `GEMINI_API_KEY`: the key from step 1 (required)
   - `ACCESS_CODE`: a password of your choice (recommended, so strangers can't use up your free quota)
4. Go to **Deploys → Trigger deploy → Deploy project** so the new settings take effect.

The site is now live at `your-name.netlify.app`. If you set an access code, share it with the people who should use the site.

## Good to know
- **Free limits:** roughly a few hundred AI requests a day. Each script uses 2, a message rewrite uses 1, and each coach reply uses 1. When the limit runs out, the site says so, and it resets the next day.
- **Who can use it:** Google's free tier is for users aged 18 or over, and isn't available for apps serving the EU, UK or Switzerland.
- **Choosing a model:** to pick one yourself, add `GEMINI_MODEL` (for example `gemini-flash-latest`). Otherwise the site picks the newest free Flash-Lite model.
- **Updating the site:** upload the new `index.html` to the GitHub repository and Netlify redeploys automatically.
