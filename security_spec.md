# Security Specification & Test Plan for Firestore

## Data Invariants
1. Users can read and update their own UserProfile document (`/users/{userId}`).
2. Public courses, assets, and quizzes can be read by authenticated users. Admins or author users can write courses/assets/quizzes.
3. Transactions (`/transactions/{transactionId}`) can be created by authenticated users for themselves (`userUid == request.auth.uid`), read by the owner or admins, and status updated by admins or the transaction owner for cancelation.
4. Notifications (`/notifications/{notificationId}`) can be read and updated (e.g., mark as read) by the recipient user (`userUid == request.auth.uid` or `userUid == 'all'`).

## Dirty Dozen Payloads Test Matrix
1. Identity Spoofing: User A creating a transaction with `userUid = User B`.
2. Orphaned Write: Creating a notification without valid `userUid` or required fields.
3. Overlarge Field: Inserting title with 10,000 characters.
4. Unauthorized Update: Non-admin changing transaction status from `pending` to `approved`.
5. PII Access Leak: Non-owner user attempting to read another user's private transactions.
6. Malformed Document ID: Attempting to use a 1KB string as document ID.
7. Shadow Keys: Injecting unexpected properties `isSystemAdmin: true` on user creation.
8. Status Skipping: Updating notification status to an invalid state.
9. Array Injection: Exceeding maximum allowed sizes in list fields.
10. Unauthenticated Access: Anonymous write to `/courses/`.
11. Re-writing Immutable Fields: Modifying `createdAt` or `userUid` after creation.
12. Bulk List Query Exploits: Querying without user bounds on user-restricted resources.
