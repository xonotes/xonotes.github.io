# XoNote - Your All-in-One Personal Information Manager

XoNote is a secure and versatile Progressive Web App (PWA) for managing notes, todo lists, passwords, and contacts.

**Live Site**: [https://xonotes.github.io/](https://xonotes.github.io/)

## Features

- **User Authentication**
  - Email/password login
  - Google authentication
  - Secure account management

- **Notes Management**
  - Create, view, edit, and delete notes
  - Rich text formatting
  - Automatic saving

- **Todo List Management**
  - Create and manage todo items
  - Mark items as complete
  - Organize and prioritize tasks

- **Password Management**
  - Securely store website credentials
  - Copy username/password with one click
  - Show/hide sensitive password data

- **Contact Management**
  - Store contact phone numbers with optional names
  - Includes country code selection (default: +91)
  - Free users: store up to 3 contacts
  - Premium users: unlimited contacts with editing capability

- **Search Functionality**
  - Search across all your content types
  - Highlighted search results
  - Quick access to matching items

- **Premium Features**
  - Unlimited content storage
  - Advanced editing capabilities
  - Enhanced privacy features

- **Settings**
  - Dark/light theme toggle
  - Personalized user preferences
  - Account management

## Deployment

XoNote is deployed using GitHub Pages. The live version is available at [https://xonotes.github.io/](https://xonotes.github.io/).

### Deploying to GitHub Pages

1. Push changes to the main branch
2. GitHub Actions will automatically build and deploy the site
3. The site will be available at your GitHub Pages URL

If you want to deploy your own fork:

1. Fork this repository
2. Go to Settings > Pages
3. Set the source to GitHub Actions
4. Push changes to trigger the deployment workflow

## Technologies Used

- **Frontend**
  - HTML5
  - Tailwind CSS
  - JavaScript (ES6+)

- **Backend**
  - Firebase Authentication
  - Firebase Firestore
  - Firebase Hosting

- **PWA Features**
  - Offline capability
  - Installable on desktop/mobile
  - Push notifications support

## Security

XoNote takes security seriously:

- All data is stored securely in Firebase Firestore
- Firestore security rules ensure users can only access their own data
- Authentication is handled securely by Firebase Auth
- Sensitive information is never stored in plain text

## Getting Started

### Prerequisites

- Node.js and npm
- Firebase account

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/xonote.git
   cd xonote
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Configure Firebase
   - Create a Firebase project at https://firebase.google.com
   - Enable Authentication (Email/Password and Google)
   - Create a Firestore database
   - Update the Firebase configuration in `js/data.js`

4. Run the development server
   ```
   npm start
   ```

5. Build for production
   ```
   npm run build
   ```

## Usage

1. Create an account or log in
2. Use the tabs to switch between Notes, Todos, Passwords, and Contacts
3. Add new items using the + button in each section
4. Edit or delete items as needed
5. Search across all content using the search button
6. Adjust settings using the settings button

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Firebase for providing the backend infrastructure
- Tailwind CSS for the styling framework
- The open-source community for inspiration and tools 