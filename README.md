# Melaky Image Upload App

A React web application that allows users to upload images with payments and view them with real-time statistics. Built with Firebase backend and Stripe payment integration.

## Features

- **Image Upload with Payment**: Users can upload images by paying a custom amount through Stripe Checkout
- **Full-Screen Display**: Images are displayed full-screen with an elegant overlay
- **Real-Time View Counter**: Shows live view count as people visit the page
- **Image Replacement**: Only one image can exist at a time - new uploads replace the previous image
- **Pay to Remove**: Users can pay to remove the current image
- **Real-Time Updates**: Uses Firebase Firestore real-time listeners for instant updates

## Tech Stack

- **Frontend**: React 18, TailwindCSS
- **Backend**: Firebase (Firestore, Storage, Cloud Functions)
- **Payments**: Stripe Checkout
- **Hosting**: Firebase Hosting

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Firestore, Storage, and Functions enabled
- Stripe account with API keys

### 1. Clone and Install Dependencies

```bash
npm install
cd functions && npm install && cd ..
```

### 2. Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database, Storage, and Cloud Functions
3. Replace placeholder values in `src/firebase.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "your-app-id"
};
```

### 3. Stripe Configuration

1. Get your Stripe API keys from https://dashboard.stripe.com/apikeys
2. In `functions/index.js`, replace the placeholder Stripe secret key:

```javascript
const stripe = new Stripe('sk_live_your_actual_stripe_secret_key_here');
```

3. Set up a webhook endpoint in Stripe Dashboard pointing to your deployed function:
   - URL: `https://your-region-your-project.cloudfunctions.net/stripeWebhook`
   - Events: `checkout.session.completed`
   - Replace the webhook secret in `functions/index.js`

### 4. Deploy to Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Build the React app
npm run build

# Deploy everything
firebase deploy
```

### 5. Development

```bash
# Start React development server
npm start

# Start Firebase emulators (optional)
firebase emulators:start
```

## Environment Variables

For production, set these environment variables in Firebase Functions:

```bash
firebase functions:config:set stripe.secret_key="sk_live_your_key"
firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret"
```

## File Structure

```
melaky-image-app/
├── public/                 # Static assets
├── src/
│   ├── App.jsx            # Main React component
│   ├── firebase.js        # Firebase configuration
│   ├── index.js           # React entry point
│   └── *.css              # Styling files
├── functions/
│   ├── index.js           # Cloud Functions (Stripe integration)
│   └── package.json       # Functions dependencies
├── firebase.json          # Firebase project configuration
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
└── package.json           # React app dependencies
```

## How It Works

1. **No Image State**: Shows upload interface with image picker and amount input
2. **Upload Process**: 
   - User selects image and enters amount
   - Image uploads to Firebase Storage
   - Stripe Checkout session created via Cloud Function
   - On successful payment, image metadata saved to Firestore
3. **Image Display**: 
   - Image shown full-screen with overlay containing amount paid and view count
   - View counter increments in real-time for each page load
4. **Remove Process**:
   - "Pay to Remove" button creates Stripe Checkout (110% of original amount)
   - On successful payment, image deleted from Storage and Firestore

## Security Features

- Stripe secret keys only in Cloud Functions (server-side)
- Firestore rules prevent client-side writes
- Storage rules allow public read but server-only writes
- Payment verification through Stripe webhooks

## Customization

- Modify removal fee calculation in `functions/index.js`
- Adjust styling in React components using TailwindCSS classes
- Add additional metadata fields in Firestore documents
- Customize Stripe Checkout appearance in the Stripe Dashboard

## Support

For issues or questions, please check the Firebase and Stripe documentation or create an issue in this repository.
