# Cancer Classification Dashboard

## Overview

This is a full-stack web application for cancer classification using machine learning models. The system provides an interactive dashboard for analyzing and predicting cancer diagnoses across three types: breast, gastric, and lung cancer. It combines XGBoost with traditional ML algorithms (SVM, Logistic Regression, Random Forest) to create ensemble models for improved accuracy. The application features model comparison, batch predictions, CSV data upload, and comprehensive performance analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development and builds
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts for data visualization (ROC curves, performance metrics)
- **Icons**: Font Awesome for consistent iconography

### Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API with structured endpoints for predictions and metrics
- **File Uploads**: Multer middleware for handling CSV file uploads
- **CSV Processing**: csv-parser for batch prediction data processing
- **Development**: Hot reloading with Vite integration for full-stack development

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL hosting
- **In-Memory Storage**: Mock storage implementation for development/testing
- **Schema Management**: Drizzle Kit for migrations and schema management

### Machine Learning Integration
- **Python Backend**: Separate Python service for ML model serving
- **Model Storage**: Joblib for serialized model persistence
- **Supported Models**: XGBoost ensembles with SVM, Logistic Regression, and Random Forest
- **Datasets**: Three cancer types (breast, gastric, lung) with synthetic data generation
- **Prediction Types**: Single predictions and batch processing via CSV upload

### API Structure
- `GET /api/metrics` - Retrieve all model performance metrics
- `GET /api/metrics/:dataset` - Get metrics for specific cancer dataset
- `POST /api/predict` - Single sample prediction across all models
- `POST /api/batch-predict` - Batch predictions from CSV uploads
- **Response Format**: Structured JSON with prediction confidence, consensus, and model agreement

### Development and Build Process
- **Package Manager**: npm with lock file for dependency consistency
- **Build System**: Vite for frontend, esbuild for backend bundling
- **TypeScript**: Strict type checking with path mapping for clean imports
- **Code Quality**: ESM modules throughout, consistent error handling
- **Environment**: Development/production configuration with environment variables

### Authentication and Security
- **Session Management**: Basic session handling (expandable for future auth)
- **File Upload Security**: Multer memory storage with file type restrictions
- **CORS**: Configured for cross-origin requests in development
- **Input Validation**: Zod schemas for API request/response validation

### Performance Optimizations
- **Query Caching**: TanStack Query with infinite stale time for model metrics
- **Bundle Splitting**: Vite's automatic code splitting for optimal loading
- **Database**: Connection pooling through Neon's serverless architecture
- **Static Assets**: Efficient serving through Express static middleware
- **Memory Management**: Multer memory storage for temporary file processing

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe PostgreSQL ORM with Zod integration
- **@neondatabase/serverless**: Serverless PostgreSQL database client
- **express**: Web application framework for Node.js
- **multer**: Middleware for handling multipart/form-data uploads
- **csv-parser**: Stream-based CSV parsing for batch operations

### UI and Styling
- **@radix-ui/react-***: Accessible component primitives (dialogs, dropdowns, etc.)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe CSS class composition
- **recharts**: Composable charting library for React

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking and enhanced IDE support
- **drizzle-kit**: Database migrations and schema management
- **tsx**: TypeScript execution for Node.js development

### Python ML Dependencies
- **scikit-learn**: Machine learning algorithms and metrics
- **xgboost**: Gradient boosting framework for ensemble models
- **pandas**: Data manipulation and analysis
- **numpy**: Numerical computing and array operations
- **joblib**: Model serialization and persistence

### Database and Storage
- **PostgreSQL**: Primary database (via Neon serverless)
- **connect-pg-simple**: PostgreSQL session store (future use)
- **Drizzle migrations**: Version-controlled schema changes