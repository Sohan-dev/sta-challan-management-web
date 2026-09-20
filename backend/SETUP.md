# Backend Setup Instructions

## Prerequisites
- Node.js installed
- MySQL Server running on localhost:3306

## Installation Steps

1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install express mysql2 cors dotenv
   ```

3. **Configure .env file** (already created with defaults)
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=Sta@2025
   DB_NAME=sta
   PORT=3002
   ```
   - Update `DB_PASSWORD` if your MySQL root user has a password

4. **Start the server**
   ```bash
   npm start
   ```
   OR
   ```bash
   node server.js
   ```

5. **Verify connection**
   - Open browser: http://localhost:3002/health
   - Should return: `{"status":"OK","message":"Server is running"}`

## Database
- Database: `test`
- Tables: `challans` and `challan_items` (auto-created)

### Migration note
If you have an existing `challans` table with item columns (`description`,
`quantity`, `remarks`), you'll need to move those values into the new
`challan_items` table and drop the columns.  A simple migration might look
like:

```sql
INSERT INTO challan_items (challanNo, description, quantity, remarks)
SELECT challanNo, description, quantity, remarks FROM challans;
ALTER TABLE challans
  DROP COLUMN description,
  DROP COLUMN quantity,
  DROP COLUMN remarks;
``` 

Run these commands in your MySQL client before restarting the server.

## API Endpoints

### Save Challan
```
POST /save-challan
Content-Type: application/json

{
  "challanNo": "STAI/010526/01/RR",
  "transportForm": "STA",
  "type": "Returnable",
  "challanDate": "2026-01-05",
  "senderName": "StarTrack Automation",
  "senderEmail": "startrackautomation@gmail.com",
  "senderContact": "+91 8101274497",
  "senderAddress": "Raghabpur...",
  "receiverName": "Receiver Name",
  "receiverEmail": "receiver@email.com",
  "receiverContact": "Phone",
  "receiverAddress": "Address",
  "items": [
    {
      "description": "Item description",
      "quantity": "5 pcs",
      "remarks": "Some remarks"
    }
  ],
  "vehicleNumber": "AB123CD",
  "pickedBy": "Name",
  "deliveryNote": "Note"
}
```

### Search Challan
```
GET /search-challan/STAI/010526/01/RR
```

### Get Statistics
```
GET /challan-stats
```

### Get All Challans
```
GET /all-challans?page=1&limit=50
```

## Troubleshooting

**Connection Error?**
- Check MySQL is running
- Verify DB_HOST, DB_USER, DB_PASSWORD in .env
- Ensure port 3306 is not blocked

**Table not created?**
- Server will auto-create the table on first run
- Check MySQL user has CREATE permission
