# MediVault

![MediVault Logo](./src/assets/logo.png)

MediVault is a secure digital medical records management system for hospitals and patients. It provides a platform for hospitals to securely upload, manage, and share patient medical records with automated notifications and audit trails. Patients can access their complete medical history in a secure timeline view with family sharing capabilities.

## Features

-   **Secure Document Upload**: Upload medical documents with end-to-end encryption.
-   **AI-Powered Analysis**: Automatically categorize and extract keywords from medical documents using AI.
-   **Patient Dashboard**: A comprehensive dashboard for patients to view their medical records, appointments, and manage family access.
-   **Doctor Dashboard**: A dedicated dashboard for doctors to manage their appointments and patients.
-   **Hospital Dashboard**: A dashboard for hospital staff to upload and manage patient records.
-   **Family Access**: Grant and revoke access to family members to view and upload medical records.
-   **Secure Search**: Search for medical documents using various filters and keywords.
-   **Real-time Notifications**: Receive real-time notifications for new document uploads and appointment updates.
-   **Theme Toggling**: Switch between light, dark, and system themes.

## Tech Stack

-   **Frontend**:
    -   [Vite](https://vitejs.dev/)
    -   [TypeScript](https://www.typescriptlang.org/)
    -   [React](https://reactjs.org/)
    -   [shadcn-ui](https://ui.shadcn.com/)
    -   [Tailwind CSS](https://tailwindcss.com/)
-   **Backend**:
    -   [Supabase](https://supabase.io/)
    -   [Deno](https://deno.land/) for serverless functions

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v14 or later)
-   [npm](https://www.npmjs.com/)

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/your_username_/Project-Name.git
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```
3.  Set up your environment variables. Create a `.env` file in the root of the project and add the following:
    ```
    VITE_SUPABASE_URL=YOUR_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```
    You can get these from your Supabase project settings.

### Running the Development Server

To start the development server, run the following command:

```sh
npm run dev
```

This will start the development server at `http://localhost:5173`.

## Supabase Backend

The backend of this project is powered by [Supabase](https://supabase.io/). It uses Supabase for authentication, database storage, and serverless functions.

### Serverless Functions

The serverless functions are located in the `supabase/functions` directory. Each function has its own subdirectory with an `index.ts` file. These functions are written in TypeScript and run on [Deno](https://deno.land/).

Here is a list of the serverless functions:

-   `analyze-document-content`: Analyzes the content of a document using the Gemini API.
-   `appointment-notifications`: Sends notifications to family members when an appointment status is updated.
-   `enhanced-document-analyze`: Performs an enhanced analysis of a document's content using a hybrid approach.
-   `enhanced-search`: Performs an enhanced search of documents based on a query and various filters.
-   `grant-access-to-family`: Grants a family member access to a patient's records.
-   `notify-patient-new-record`: Sends notifications to a patient and their family members when a new medical record is uploaded.
-   `notify-patient-upload`: Sends notifications to family members when a new document is uploaded for a patient.
-   `pdf-text-extractor`: Extracts text from a PDF file.
-   `pdf-to-images`: A deprecated function that is no longer used.
-   `search-documents`: Searches for documents based on various filters.
-   `upload-document`: Handles the uploading of a document.
-   `upload-record`: Handles the uploading of a medical record.

## Deployment

To deploy this project, you can use any hosting provider that supports Node.js. You will need to set up the environment variables for your Supabase project in your hosting provider's settings.

## License

Distributed under the MIT License. See `LICENSE` for more information.
