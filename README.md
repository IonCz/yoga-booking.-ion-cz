# Yoga & Mindfulness Studio – Booking Application

This web application was developed as part of the Web Application Development coursework.  
It represents a booking system for a Yoga & Mindfulness Studio where users can browse courses, enroll, and book sessions.

The project started from a basic starter application, but it has been significantly extended with authentication, role-based access, improved booking logic, and a full admin management system.

---

## Technologies Used

- Node.js  
- Express.js  
- Mustache (templating engine)  
- NeDB (file-based database)  
- JSON Web Tokens (JWT) for authentication  
- Bcrypt for password hashing  
- Bootstrap (CSS framework)  
- Custom CSS for styling and UI improvements  

---

## How to Run the Application

- Clone the repository  
- Install dependencies:  
  npm install  
- Start the server:  
  npm start  
- Open in browser:  
  http://localhost:3000  

---

## User Functionality (Student)

### Register and Login

- Users can create an account via the register page  
- After registering, the user is automatically logged in  
- Authentication is handled using JWT stored in cookies  

### Browse Courses

- View all available courses  
- Search courses by keyword  
- Open a course to view its sessions  

### Enroll in a Course

- A user must enroll before booking sessions  
- Enrollment is done from the course page  
- Duplicate enrollments are prevented  

### Book Sessions

- Go to "My Courses"  
- Select a course  
- Book available sessions  

Booking rules:
- Cannot book without being enrolled  
- Cannot book the same session twice  
- Sessions may become waitlisted if full  

### Manage Bookings

- View all bookings  
- Cancel individual sessions  
- Cancel the entire course  

Important:
- Cancelling a course removes all related session bookings automatically  

### Manage Account

- Update personal details  
- Change password  

Restriction:
- Users cannot change their role themselves  

---

## Admin / Instructor Functionality

When logged in as an instructor/admin, an Admin Dashboard becomes available.

### Dashboard Sections

- Courses  
- Sessions  
- Users  
- Participants  

### Course Management

- Create new courses  
- Edit existing courses  
- Delete courses  

Important:
- Deleting a course removes it for all students  
- Associated sessions and bookings are also removed  

### Session Management

- Create sessions for a course  
- Edit session details  
- Delete sessions  

### User Management

- View all users  
- Create new users  
- Edit user details  
- Delete users  
- Change user roles (student ↔ instructor)  

### Important Warning (Role Management)

- Only instructors/admins can change roles  

If you change your own role from instructor to student:
- You will lose access to the Admin Dashboard  

Important:
- You cannot promote yourself back from the UI  
- This requires manual database changes  

Recommendation:
- Do not change your own role unless necessary  
- Always keep at least one instructor account  

### Participant Management

- View participants per course or session  
- Monitor bookings and attendance  

---

## Access Control

Non-authenticated users:
- Can only access public pages  

Students:
- Can enroll and book sessions  
- Can manage their own bookings  

Instructors/Admins:
- Have full CRUD access  
- Can manage users and roles  

Route protection ensures unauthorized access is blocked  

---

## Notes

- The application uses NeDB (local file database), so data is stored locally  
- Database files must be included for deployment  

Environment variables required:
- ACCESS_TOKEN_SECRET  
- BCRYPT_SALT_ROUNDS
- BASE_URL

---

## Summary

This application evolved from a simple starter project into a fully functional booking system.  
It now supports secure authentication, role management, realistic booking workflows, and full administrative control.
