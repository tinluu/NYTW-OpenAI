# MakeQuestions Next.js

A modern question generation application built with Next.js 14, TypeScript, and AI-powered features.

## Features

- 🤖 **AI-Powered Question Generation**: Integration with OpenAI and Perplexity APIs
- 🔐 **Authentication**: Secure user authentication with Clerk
- 💳 **Payments**: Stripe integration for premium features
- 🎨 **Modern UI**: Built with Radix UI components and Tailwind CSS
- 📱 **Responsive Design**: Mobile-first design approach
- 🌙 **Dark Mode**: Full dark mode support
- 📝 **Rich Text Editing**: Quill editor integration
- 🗃️ **Database**: MongoDB integration for data persistence

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Authentication**: Clerk
- **Payments**: Stripe
- **Database**: MongoDB
- **AI APIs**: OpenAI, Perplexity
- **State Management**: Zustand
- **Animations**: Framer Motion

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.local` and update with your API keys:
   - OpenAI API Key
   - Clerk Authentication keys
   - Stripe keys
   - MongoDB connection string
   - Perplexity API key

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

## Project Structure

```
├── app/                    # Next.js 14 App Router
├── components/            # React components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility functions
└── ...
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
