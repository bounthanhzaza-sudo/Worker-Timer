# Employee Attendance Management System (EAMS) - Database Architecture

## Overview
This directory contains the production-grade Mongoose ODM schemas for the **Employee Attendance Management System (EAMS)**. The design prioritizes data integrity, referential consistency, high-performance querying, and geospatial capabilities.

---

## Entity Relationship & Schema Specifications

### 1. Branch
- **Purpose**: Represents physical office locations or regional branches.
- **Fields**:
  - `name` (String, Unique, Indexed)
  - `address` (Nested Object: street, city, state, country, zipCode)
  - `location` (GeoJSON `Point` with longitude and latitude)
- **Indexes**: 
  - `2dsphere` index on `location` for geofenced employee check-ins.

### 2. Shift
- **Purpose**: Defines working hours and grace periods for employees.
- **Fields**:
  - `name` (String, Unique)
  - `startTime` (String, 24-hr format "HH:mm")
  - `endTime` (String, 24-hr format "HH:mm")
  - `gracePeriodMinutes` (Number, default: 15)

### 3. Employee
- **Purpose**: Core user entity representing staff members, managers, and administrators.
- **Fields**:
  - `name` (String)
  - `email` (String, Unique, Indexed)
  - `password` (String, excluded from default queries with `select: false`)
  - `role` (Enum: `['Admin', 'Manager', 'Staff']`, Indexed)
  - `branchId` (ObjectId ref `Branch`, Indexed)
  - `shiftId` (ObjectId ref `Shift`, Indexed)
  - `status` (Enum: `['Active', 'Inactive', 'Suspended', 'Resigned']`, Indexed)
- **Indexes**:
  - Compound index `{ branchId: 1, role: 1 }` for filtering branch staff by role.

### 4. Attendance
- **Purpose**: Records daily attendance logs, check-in/out times, and calculated hours.
- **Fields**:
  - `employeeId` (ObjectId ref `Employee`, Indexed)
  - `date` (Date, Indexed)
  - `checkInTime` (Date)
  - `checkOutTime` (Date)
  - `status` (Enum: `['Present', 'Late', 'Absent', 'On Leave']`, Indexed)
  - `workHours` (Number)
  - `otHours` (Number)
- **Indexes**:
  - Compound unique index `{ employeeId: 1, date: 1 }` to prevent duplicate attendance entries per employee per day.
  - Compound index `{ date: 1, status: 1 }` for attendance reporting.

### 5. LeaveRequest
- **Purpose**: Manages employee leave applications and approvals.
- **Fields**:
  - `employeeId` (ObjectId ref `Employee`, Indexed)
  - `leaveType` (Enum: `['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid']`)
  - `startDate` (Date, Indexed)
  - `endDate` (Date, Indexed)
  - `reason` (String)
  - `status` (Enum: `['Pending', 'Approved', 'Rejected']`, Indexed)
  - `approvedBy` (ObjectId ref `Employee`)
- **Indexes**:
  - Compound index `{ employeeId: 1, status: 1 }`
  - Date range index `{ startDate: 1, endDate: 1 }`

### 6. OvertimeRequest
- **Purpose**: Tracks requests for overtime approval.
- **Fields**:
  - `employeeId` (ObjectId ref `Employee`, Indexed)
  - `date` (Date, Indexed)
  - `hours` (Number, min: 0.5, max: 12)
  - `reason` (String)
  - `status` (Enum: `['Pending', 'Approved', 'Rejected']`, Indexed)
  - `approvedBy` (ObjectId ref `Employee`)
- **Indexes**:
  - Compound index `{ employeeId: 1, date: 1 }`
  - Compound index `{ status: 1, date: 1 }`
