# Let's Not Meet — Calendar Scheduler

A privacy-focused calendar scheduling tool that lets you share your availability without revealing your actual calendar events. Perfect for coordinating meetings across different schedules while respecting everyone's privacy.

I made this in one evening with Claude out of frustration with people not being able to arrange meetings. We get it. None of us want to meet anyway. Let's just use this to get it out of the way in the easiest way possible.

## Features

- View your calendar availability with 15-minute granularity
- Set "absurd hours" that you never want to be available for meetings
- Schedule with groups and see common availability
- Privacy-focused: only shares free/busy information, not actual events
- Test mode for trying the app without connecting to your real calendar

## Setup Instructions

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/Ege-Cakar/letsnotmeet.git
   cd letsnotmeet
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your Firebase configuration:
   ```
   # Copy the example file
   cp .env.example .env
   
   # Edit with your Firebase details
   nano .env
   ```

4. Start the development server:
   ```
   npm start
   ```

### Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication with Google sign-in
3. Set up Firestore database
4. Add your Firebase project configuration to the `.env` file

### Deployment

To deploy to GitHub Pages:

1. Update the `homepage` field in `package.json` with your GitHub username
2. Install the gh-pages package:
   ```
   npm install --save-dev gh-pages
   ```
3. Deploy:
   ```
   npm run deploy
   ```

## Environment Variables

The following environment variables need to be set in your `.env` file:

```
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

## Test Mode

The app includes a test mode that can be enabled via the toggle in the header. This allows you to:

- Test the interface without connecting to your real calendar
- Add simulated participants to test group scheduling
- Experiment with different availability patterns

This is left-over from development but I didn't see a reason to take it out for now. Might remove it in the future. 

## Privacy Notes

This application is designed with privacy in mind:
- Only uses the minimum required scopes for Google Calendar
- Only shares availability information, never event details
- Your calendar events are never stored in our database
