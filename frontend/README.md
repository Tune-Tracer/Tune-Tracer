# Tune Tracer Frontend Instructions

This is the instructions for running the frontend of the project

## Installing packages
To install the packages necessarily for development, run `npm install` in the parent directory. The frontend directory does not have its own package.json so running install in the root directory is fine
## Running the development server
To run the frontend, run the command `npm run dev` in the frontend directory to start a development server. When loading a page for the first time it has to compile so it might take a second in order to load it. This is perfectly normal, you have done nothing wrong.
When the development server is ready it will not automatically open up to the project, you'll have to navigate to `http://localhost:3000/` in your browser
## UserID
To use the cookies in the frontend, import functions from the `cookie.ts` file in the "src/app/" directory. Here is an example for saving and retrieving the userID:
```ts
import { saveUserID, getUserID, clearUserID } from "..cookie";

// Store the userID
saveUserID('sample user ID');

// Retrieve userID
// Returns: 'sample user ID'
const userID = getUserID();

// Delete the userID. Useful for logging out
clearUserID();
```