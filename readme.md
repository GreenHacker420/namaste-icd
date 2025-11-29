# NAMASTE-ICD Intelligent Mapping Engine

**NAMASTE-ICD** is a next-generation terminology service designed to bridge the gap between Traditional Medicine systems (Ayurveda, Siddha, Unani) and the WHO's ICD-11 TM2 classification. By leveraging advanced AI and semantic analysis, it facilitates accurate, standardized, and efficient mapping of morbidity codes.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-beta-orange.svg)

## 🌟 Features

- **Semantic Search**: Find relevant codes using natural language descriptions, not just exact keyword matches.
- **AI-Powered Mapping**: Automatically suggests mappings between NAMASTE and ICD-11 TM2 codes using Google Gemini Pro.
- **Interactive Dashboard**: Visualize mapping progress, confidence distributions, and system coverage.
- **Dual-System Support**: Seamlessly browse and map across Ayurveda, Siddha, and Unani systems.
- **Validation Workflow**: Built-in tools for human experts to review, approve, or reject AI-suggested mappings.

## 🛠 Tech Stack

### Frontend (`namaste-ui`)
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/)
- **State**: [React Query](https://tanstack.com/query/latest)

### Backend (`namaste-api`)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Hono](https://hono.dev/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma](https://www.prisma.io/)
- **AI Integration**: [LangChain](https://js.langchain.com/) & [Google Vertex AI](https://cloud.google.com/vertex-ai)

## 🚀 Getting Started

### Prerequisites
- Node.js >= 22.0.0
- Docker (for local database)
- Google Cloud Project with Vertex AI enabled (for AI features)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/namaste.git
cd namaste
```

### 2. Backend Setup
Navigate to the API directory:
```bash
cd namaste-api
```

Install dependencies:
```bash
npm install
```

Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your PostgreSQL URI and Google Cloud credentials
```

Start the database (using Docker):
```bash
# If you have a docker-compose.yml (optional)
# docker-compose up -d db

# Or ensure your local Postgres is running and update DATABASE_URL in .env
```

Initialize the database:
```bash
npm run db:generate
npm run db:push
```

Seed data (optional):
```bash
npm run seed
```

Start the development server:
```bash
npm run dev
```
The API will be available at `http://localhost:3000`.

### 3. Frontend Setup
Open a new terminal and navigate to the UI directory:
```bash
cd namaste-ui
```

Install dependencies:
```bash
npm install
```

Configure environment variables:
```bash
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3000
```

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3001`.

## 📦 Deployment

### Frontend (Vercel)
The easiest way to deploy the Next.js frontend is via Vercel.

1. Push your code to a Git repository (GitHub/GitLab).
2. Import the project into Vercel.
3. Select the `namaste-ui` directory as the Root Directory.
4. Add environment variables (e.g., `NEXT_PUBLIC_API_URL`).
5. Click **Deploy**.

### Backend (Render / Railway)
For the Node.js backend, platforms like Render or Railway are recommended.

**Render:**
1. Create a new **Web Service**.
2. Connect your Git repository.
3. Set the Root Directory to `namaste-api`.
4. Set the Build Command: `npm install && npm run db:generate`.
5. Set the Start Command: `npm start`.
6. Add environment variables (`DATABASE_URL`, `GOOGLE_API_KEY`, etc.).

### Database
Use a managed PostgreSQL provider:
- **Supabase**: Excellent free tier.
- **Neon**: Serverless Postgres.
- **Render/Railway**: Built-in database services.

Ensure your `DATABASE_URL` in the backend environment variables points to this managed instance.

## 📚 Documentation
For more detailed information about the system architecture, please refer to [architecture.md](./architecture.md).

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
