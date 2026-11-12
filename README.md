# NUTIRLENS-AI

NutriLens AI Design System & Smart Nutrition Monitoring Platform.

## AI Food Scanner

The scanner uses Vercel Node.js functions in `api/scanner` for authenticated
Gemini image analysis and USDA FoodData Central nutrient lookups. Add the
variables from `.env.example` to the Vercel project's server-side environment;
do not expose provider keys through `VITE_*` variables or commit a `.env` file.

Meal photos and reports are saved to Firebase Storage and the authenticated
user's `users/{uid}/meals` Firestore collection only when the user chooses
**Save meal**. Deploy the included `firestore.rules` and `storage.rules` to the
Firebase project before testing history and saved images:

```sh
firebase deploy --only firestore:rules,storage --project <firebase-project-id>
```

For local end-to-end testing, run the frontend and backend in separate
terminals: `npm run dev` and `npm run dev:backend`. The backend reads ignored
`.env` and `.env.local` files and serves the same scanner handlers as the Vercel
functions. The Vite `/api` proxy forwards requests to the local backend.

To test the scanner, sign in, open **AI Scanner**, choose or capture a JPG, PNG,
or WEBP image under 3 MB, then select **Analyse my meal**. Adjust detected
weights and save the report to verify the history and daily-summary views.
Nutrients come only from FoodData Central matches; values not present in the
database are displayed as N/A. Freshness is a visual estimate and is not a
food-safety assessment.
