# Getting the XGBoost engine running on Modal

"**create_asgi inactive**" in the Modal dashboard is **normal**. It means no container is running *right now*. Modal starts the container when the **first request** hits your URL (cold start). So the app is deployed; it’s just idle until something calls it.

Follow these steps to get it working end-to-end.

---

## 1. Install Modal and log in

From your project root (the folder that contains `modal_apps/`):

```bash
pip install -r modal_apps/requirements.txt
modal token new
```

Sign up or log in in the browser when prompted. You only need to do this once.

---

## 2. Make sure the model file exists

The Modal app needs `model.joblib` in the repo. From the **`my-app`** folder:

- Check that this file exists:  
  `src/ml/preference_engine_XGBoost/artifacts/model.joblib`
- If it doesn’t, or after changing features (e.g. `interest_match`), train the model first (from **`my-app`**):

  ```bash
  cd src
  pip install -r ml/preference_engine_XGBoost/requirements.txt
  python -m ml.preference_engine_XGBoost.train
  cd ..
  ```

  Then redeploy (step 3).

---

## 3. Deploy the app to Modal

From **`my-app`** (the folder that contains `modal_apps/`):

```bash
modal deploy modal_apps/preference_engine_xgboost.py
```

Wait until it finishes. At the end you’ll see a line like:

```text
Created web endpoint at https://YOUR_WORKSPACE--preference-engine-xgboost.modal.run
```

**Copy that full URL** (no path, no trailing slash). That’s your engine URL.

---

## 4. Test the endpoint

In a browser or with curl, open:

```text
https://YOUR_WORKSPACE--preference-engine-xgboost.modal.run/health
```

(Use the same URL from step 3, with `/health` at the end.)

- The **first** request can take **20–60 seconds** while Modal starts the container. Don’t close the tab; wait for a response.
- You should get something like:  
  `{"status":"ok","engine":"preference_engine_XGBoost"}`
- If you get that, Modal is working. In the dashboard, **create_asgi** may still show "inactive" until a request comes in; after a successful `/health`, it might show as active for a bit.

If you get an error or timeout, see the troubleshooting section below.

---

## 5. Connect your Next.js app

In **`my-app/.env`**, set:

```env
PREFERENCE_ENGINE_XGBOOST_URL=https://YOUR_WORKSPACE--preference-engine-xgboost.modal.run
```

Use the **exact** URL from step 3 (no `/health`, no trailing slash).

Restart your Next.js dev server so it picks up the new env var. When you open “Choose activities” in the app, the backend will call Modal’s `/batch_score`; the first request may be slow (cold start), then it should be faster.

---

## Troubleshooting

| Problem | What to try |
|--------|-------------|
| **`modal: command not found`** | Run `pip install -r modal_apps/requirements.txt` from the folder that has `modal_apps/`. Use the same Python (or venv) you use for the project. |
| **Deploy fails (e.g. file not found)** | Run `modal deploy` from **`my-app`** (the directory that contains `modal_apps/`). Ensure `src/ml/preference_engine_XGBoost/artifacts/model.joblib` exists. |
| **/health times out** | First request does a cold start (often 20–60 s). Wait once; if it still times out, check the Modal dashboard for errors on the function. |
| **Attractions don’t load / all 0%** | The app falls back to interest-based ranking if Modal fails or times out. Check the Next.js server logs for `[recommendations] Engine request failed` or `Engine non-OK`. Increase client timeout (already 50s) if needed. You can leave `PREFERENCE_ENGINE_XGBOOST_URL` unset to use only the fallback. |

---

## Summary

- **Inactive** = no container running yet; it starts when the URL is called.
- **Deploy** from `my-app`: `modal deploy modal_apps/preference_engine_xgboost.py`
- **Test** the URL with `/health`; wait for the first (slow) response.
- **Set** `PREFERENCE_ENGINE_XGBOOST_URL` in `.env` to that URL and restart Next.js.
