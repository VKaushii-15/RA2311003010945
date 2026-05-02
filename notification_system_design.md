# Stage 1

## Core Actions
1. **Fetch Notifications:** Retrieve a paginated list of notifications for the logged-in user.
2. **Mark Notification as Read:** Update the status of a specific notification to 'read'.
3. **Mark All as Read:** Update the status of all unread notifications for the user to 'read'.
4. **Get Unread Count:** Retrieve the total number of unread notifications for the user.
5. **Delete Notification (Optional):** Remove a specific notification from the user's view.

## REST API Endpoints & Contracts

### 1. Fetch Notifications
**Endpoint:** `GET /api/v1/notifications`

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Accept": "application/json"
}
```

**Request Query Parameters:**
- `page` (integer, optional, default: 1)
- `limit` (integer, optional, default: 20)
- `status` (string, optional, enum: ['unread', 'read', 'all'], default: 'all')

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_12345",
        "type": "alert",
        "title": "New Login Detected",
        "message": "A new login was detected from a new device.",
        "status": "unread",
        "actionUrl": "/security/devices",
        "createdAt": "2023-10-27T10:00:00Z"
      }
    ],
    "meta": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

### 2. Mark Notification as Read
**Endpoint:** `PATCH /api/v1/notifications/{notificationId}/read`

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

**Request Body:** None required.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "notif_12345",
    "status": "read",
    "readAt": "2023-10-27T10:05:00Z"
  }
}
```

### 3. Mark All Notifications as Read
**Endpoint:** `POST /api/v1/notifications/read-all`

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

**Request Body:** None required.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All unread notifications marked as read."
}
```

### 4. Get Unread Count
**Endpoint:** `GET /api/v1/notifications/unread-count`

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Accept": "application/json"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

## Real-Time Notification Mechanism
To deliver real-time notifications to logged-in users instantly, we will implement **WebSockets** (using a library like Socket.io or standard WebSockets).

1. **Connection:** When the user successfully logs into the application, the client establishes a secure WebSocket connection to `wss://api.example.com/notifications`.
2. **Authentication:** The initial handshake request includes the user's JWT token to authenticate the connection.
3. **Event Subscription:** The backend assigns the client to a private, user-specific room (e.g., `room_user_{userId}`).
4. **Push Mechanism:** When a system event generates a new notification (e.g., a background job finishes or another user sends a message), the backend saves the notification to the database and immediately emits a `new_notification` event via WebSocket to that specific user's room.
5. **Payload Structure:**
```json
{
  "event": "new_notification",
  "data": {
    "id": "notif_67890",
    "type": "message",
    "title": "New Message Received",
    "message": "You have a new message from John.",
    "status": "unread",
    "createdAt": "2023-10-27T10:10:00Z"
  }
}
```
*(Alternative: Server-Sent Events (SSE) could be used if strictly unidirectional server-to-client communication is needed, but WebSockets offer more robust bidirectional capabilities if action-tracking is required).*

# Stage 2

## Persistent Storage Choice
For storing notification data reliably, I recommend using a **NoSQL Database like MongoDB**.

**Explanation of Choice:**
1. **Flexible Schema:** Notifications often possess varied metadata depending on their `type` (e.g., a 'login alert' might include an IP address, while a 'new comment' notification contains a `commentId` and `postId`). NoSQL document stores handle polymorphic data structures naturally without requiring sparse columns or complex relational joins.
2. **High Write Throughput:** Notification systems are inherently write-heavy. MongoDB provides excellent write performance and horizontal scalability, which is critical as user activity scales.
3. **Efficient Fetching:** Because a document can contain all nested metadata needed for a notification, fetching paginated feeds is extremely fast compared to aggregating multiple SQL tables.

## Database Schema (MongoDB Document Structure)
**Collection:** `notifications`

```json
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."), // Indexed: Owner of the notification
  "type": "string", // Enum: 'alert', 'message', 'system', 'promotion'
  "title": "string",
  "message": "string",
  "status": "string", // Enum: 'unread', 'read'
  "actionUrl": "string", // Optional: Link to redirect user on click
  "metadata": { 
    // Flexible payload for type-specific data
    "senderId": ObjectId("..."),
    "ipAddress": "192.168.1.1"
  },
  "createdAt": ISODate("..."), // Indexed: Used for chronological sorting
  "readAt": ISODate("...") // Nullable: Timestamp when marked as read
}
```

**Required Indexes:**
- `{ userId: 1, createdAt: -1 }`: To quickly fetch and paginate the most recent notifications for a user.
- `{ userId: 1, status: 1 }`: To optimize the calculation of unread counts.

## Potential Problems at Scale & Solutions

**Problem 1: Storage Exhaustion and Slower Queries**
As data volume grows to millions or billions of rows, the `notifications` collection will consume massive amounts of disk space and slow down queries.
**Solution:** Implement a **Data Archival & TTL (Time-To-Live)** strategy. Most users do not care about notifications older than a few weeks. Create a TTL index on `createdAt` (e.g., 30 days) to automatically drop old records. Alternatively, run an archival job to move older records to cheap object storage (like AWS S3) before deleting them from the primary DB.

**Problem 2: Sudden Write Spikes (Thundering Herd)**
If a system-wide broadcast notification is sent to 1 million users simultaneously, attempting synchronous database writes will overwhelm the database, causing failures.
**Solution:** Use **Asynchronous Processing via Message Queues** (e.g., Kafka, RabbitMQ, or AWS SQS). The application service publishes the broadcast event to a queue. Background worker nodes consume the queue at a steady rate and batch-insert the notifications into the database, protecting it from being overwhelmed.

**Problem 3: Expensive "Unread Count" Queries**
Running a `countDocuments` query on the DB frequently for active users can become a CPU bottleneck.
**Solution:** Implement **Redis Caching** for the unread counts. Maintain a key like `user:{id}:unread_count` in Redis. Increment it when a new notification is fired, and decrement/reset it when the user reads notifications. Fetch the count directly from memory instead of hitting the database.

## Database Queries based on REST APIs (MongoDB Syntax)

### 1. Fetch Notifications (Paginated)
```javascript
db.notifications.find({ userId: ObjectId("USER_ID") })
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
```

### 2. Mark Notification as Read
```javascript
db.notifications.updateOne(
  { _id: ObjectId("NOTIFICATION_ID"), userId: ObjectId("USER_ID") },
  { 
    $set: { 
      status: "read", 
      readAt: new Date() 
    } 
  }
);
```

### 3. Mark All as Read
```javascript
db.notifications.updateMany(
  { userId: ObjectId("USER_ID"), status: "unread" },
  { 
    $set: { 
      status: "read", 
      readAt: new Date() 
    } 
  }
);
```

### 4. Get Unread Count
```javascript
db.notifications.countDocuments({ 
  userId: ObjectId("USER_ID"), 
  status: "unread" 
});
```

# Stage 3

## Query Performance Analysis

**Original Query:**
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

**1. Is this query accurate?**
Yes, the query is logically accurate for retrieving all unread notifications for a specific student, sorted from the most recent to the oldest.

**2. Why is this slow?**
The query is slow because as the table grows to 5,000,000 rows, without an appropriate index, the database engine must perform a **full table scan** (or a very large partial index scan). It has to check every row to see if `studentID = 1042` and `isRead = false`. Additionally, sorting millions of rows dynamically (`ORDER BY createdAt DESC`) requires a "filesort" operation in memory or on disk, which is highly computationally expensive.

**3. What would you change and what would be the likely computation cost?**
**Change:** 
I would create a **composite index** that covers both the filtering criteria (`WHERE`) and the sorting criteria (`ORDER BY`). 
```sql
CREATE INDEX idx_student_unread_created ON notifications(studentID, isRead, createdAt DESC);
```
Additionally, I would avoid using `SELECT *` and instead only select the specific columns needed by the frontend (e.g., `SELECT id, notificationType, message, createdAt`). This reduces disk I/O, memory usage, and network payload.

**Computation Cost:**
With the composite index, the database can traverse the B-Tree index to instantly locate the exact subset of rows for `studentID = 1042` and `isRead = false`. Because the index already stores `createdAt` sequentially, the engine doesn't need to perform a separate sorting step. 
The computation cost drops drastically from **O(N)** (where N is the total table size) or **O(M log M)** (sorting unindexed results) down to **O(log N + K)** (where K is the small number of matching unread notifications). This transforms a heavy query into an instantaneous lookup.

## Indexing Strategy

**4. Is the advice to add indexes on every column effective? Why/Why not?**
No, this is highly ineffective and counterproductive advice.

**Why Not:**
- **Severe Write Penalty:** Every time a new notification is inserted, updated, or deleted, the database must also synchronously update *every single index*. In a write-heavy system like a notification engine, this will cripple write throughput and cause massive lock contention.
- **Inflated Storage Cost:** Indexes consume physical disk space and precious RAM. Indexing every column will exponentially inflate the storage size of the database. Furthermore, it will push useful data out of the fast in-memory buffer pool, slowing down the overall system performance.
- **Optimizer Confusion:** Having too many overlapping or unnecessary indexes can confuse the SQL Query Optimizer, potentially causing it to select suboptimal execution plans. 
Indexes should only be created strategically based on actual, observed query access patterns (specifically columns used frequently in `WHERE`, `JOIN`, and `ORDER BY` clauses).

## Recent Placement Notifications Query

**5. Query to find all students who got a placement notification in the last 7 days:**

```sql
SELECT DISTINCT studentID 
FROM notifications 
WHERE notificationType = 'Placement' 
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```
*(Note: `NOW() - INTERVAL 7 DAY` is syntax commonly used in MySQL. For PostgreSQL, the syntax would be `CURRENT_TIMESTAMP - INTERVAL '7 days'`)*
