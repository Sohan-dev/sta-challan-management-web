# STA Challan Management System

A modern web application for managing challans and quotations for StarTrack Automation India Pvt. Ltd. (Shipping & Trading Advisors). Built with React + Vite for the frontend and Express.js + MySQL for the backend.

## Features

- **User Authentication**: Secure login system for authorized access
- **Challan Management**: Create, search, and manage challans with auto-generated numbering
- **Quotation Management**: Generate and manage quotations with PDF export capabilities
- **PDF Generation**: Export challans and quotations as PDF documents using jsPDF and html2canvas
- **Real-time Search**: Search for existing challans by number
- **Responsive Design**: Clean, modern UI with smooth animations using Framer Motion
- **Edit Functionality**: Modify and update existing challan records
- **Company Data Management**: Support for multiple company entities (STA, STAIPL)

## Tech Stack

### Frontend
- **React 19.2**: Modern React with Hooks
- **Vite 7.2**: Fast build tool with HMR support
- **Framer Motion 12.23**: Smooth animations and transitions
- **jsPDF & html2canvas**: PDF generation and rendering
- **CSS3**: Custom styling with animations

### Backend
- **Node.js + Express 4.18**: RESTfUl API server
- **MySQL 2**: Relational database
- **CORS**: Cross-origin resource sharing support
- **dotenv**: Environment variable management

## Project Structure

```
sta-react/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx         # User authentication
│   │   ├── Dashboard.jsx         # Main application interface
│   │   └── QuotationForm.jsx     # Quotation creation form
│   ├── styles/                   # CSS files for each page
│   ├── utils/
│   │   └── challanUtils.js       # Challan numbering utilities
│   ├── App.jsx                   # Main app component
│   └── main.jsx                  # Entry point
├── backend/
│   ├── routes/
│   │   └── challanRoutes.js      # API routes
│   ├── server.js                 # Express server
│   ├── package.json              # Backend dependencies
│   └── SETUP.md                  # Backend setup guide
├── public/                       # Static assets
├── vite.config.js               # Vite configuration
└── package.json                 # Frontend dependencies
```

## Getting Started

### Prerequisites
- Node.js 16+ installed
- MySQL 5.7+ running
- npm or yarn package manager

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your database credentials:
```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=db_name
DB_PORT=3306
PORT=3001
```

4. Run database setup (execute `database_setup.sql` in MySQL):
```bash
mysql -u root -p < ../database_setup.sql
```

5. Start the backend server:
```bash
npm start
```

The backend API will run on `http://localhost:3002`

### Running Both Simultaneously

To run both frontend and backend concurrently:
```bash
npm run start:all
```

Or use the provided batch/PowerShell scripts:
- Windows (Batch): `start.bat`
- Windows (PowerShell): `start.ps1`

## Available Scripts

### Frontend
- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint checks
- `npm run start:backend` - Start backend server
- `npm run start:all` - Run frontend and backend concurrently

### Backend
- `npm start` - Start production server
- `npm run dev` - Start with file watcher (--watch)

## API Endpoints

### Authentication
- `POST /api/login` - User login endpoint

### Challan Management
- `GET /api/challans/:id` - Get challan by ID
- `POST /api/challans` - Create new challan
- `PUT /api/challans/:id` - Update challan
- `DELETE /api/challans/:id` - Delete challan
- `GET /api/challans/counter/current` - Get current challan counter

### Quotation Management
- `POST /api/quotations` - Create new quotation
- `GET /api/quotations/:id` - Get quotation by ID

*See backend/SETUP.md for detailed API documentation*

## Database Schema

The application uses MySQL with the following main tables:
- `users` - User authentication records
- `challans` - Challan documents
- `quotations` - Quotation records
- `challan_counter` - Auto-increment counter for challan numbers

*Full schema details in database_setup.sql*

## Features in Detail

### Challan Management
- Create challans with auto-generated sequential numbers
- Search and retrieve existing challans
- Edit challan details
- Generate PDF exports of challans
- View company-specific data (STA/STAIPL)

### Quotation System
- Create quotations with line items
- Link quotations to challans
- Export quotations as PDF
- Manage quotation status and timeline

### User Interface
- Animated transitions using Framer Motion
- Responsive design for desktop and tablet
- Clean, professional styling
- Real-time form validation
- Error handling and user feedback

## Configuration

### Environment Variables (Backend)

Create a `.env` file in the `backend/` directory:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=db_name
DB_PORT=3306
PORT=3001
NODE_ENV=development
```

## Troubleshooting

### Database Connection Issues
- Ensure MySQL is running
- Check credentials in `.env` file
- Verify database exists: `CREATE DATABASE db_name;`

### CORS Errors
- Backend server must be running on port 3001
- Ensure CORS middleware is enabled
- Check frontend API endpoints match backend URL

### PDF Export Issues
- Ensure both html2canvas and jsPDF are properly installed
- Check browser console for specific errors
- Try exporting simpler documents first

## Future Enhancements

- User role-based access control (Admin, User, Viewer)
- Advanced reporting and analytics
- Bulk import/export functionality
- Mobile app version
- Payment integration

## License

StarTrack Automation India Pvt. Ltd.

## Support

For issues or questions, please refer to:
- Backend Setup Documentation (backend/SETUP.md)
- Database Setup (database_setup.sql)

---

**Last Updated**: January 2026

