# Team Role Management System

## Overview
Implemented a comprehensive team role management system that allows administrators to assign specific roles to team members on a per-team basis. This means a user can have different roles across different teams they belong to.

## Features

### 🎯 **Team-Specific Roles**
- **Captain** ⭐ - Team leader with full authority (one per team)
- **Co-Captain** 👥 - Assistant leader who supports the Captain
- **Coach** 🏃 - Responsible for training, strategy, and player development
- **Coordinator** 📋 - Handles logistics, scheduling, and organization
- **Administrator** 🔧 - Administrative privileges for team management
- **Member** 👤 - Regular team member with standard participation rights

### 🔧 **Admin Features**
1. **Role Management Tab** - New dedicated tab for team administrators
2. **Individual Role Assignment** - Change any member's role independently
3. **Admin Privilege Toggle** - Grant or remove admin status while maintaining role
4. **Role Validation** - Prevents multiple captains, validates role restrictions
5. **Real-time Updates** - Immediate feedback and role changes

### 🎨 **User Experience**
- **Visual Role Badges** - Color-coded badges with icons for each role
- **Role Descriptions** - Clear explanations of each role's responsibilities
- **Smart Validation** - Prevents conflicts like multiple captains
- **Intuitive Interface** - Easy-to-use dropdowns and buttons
- **Immediate Feedback** - Success/error messages for all actions

## Technical Implementation

### Components
- **TeamRoleManager.tsx** - Main role management interface
- **TeamTabs.tsx** - Enhanced with role management tab
- **API Routes** - Updated role management endpoints

### API Endpoints
- `POST /api/teams/[teamId]/update-role` - Update member role
- `POST /api/teams/[teamId]/promote` - Grant admin privileges
- `POST /api/teams/[teamId]/demote` - Remove admin privileges

### Database Schema
Uses existing `TeamMember` model with:
- `role` field for position-specific roles
- `isAdmin` boolean for administrative privileges
- Team-specific memberships allowing different roles per team

## Usage

### For Team Administrators:
1. Navigate to team page
2. Click "Role Management" tab
3. Click "Change Role" next to any member
4. Select new role from dropdown
5. Click "Update Role" to save changes
6. Use "Grant Admin" / "Remove Admin" for administrative privileges

### Role Hierarchy:
- **Captain**: Highest authority, typically team leader
- **Co-Captain**: Second in command, assists captain
- **Coach**: Training and strategy focus
- **Coordinator**: Logistics and organization focus
- **Administrator**: General admin privileges
- **Member**: Standard participation rights

## Benefits

1. **Flexibility**: Users can have different roles on different teams
2. **Clear Structure**: Well-defined role hierarchy and responsibilities
3. **Easy Management**: Administrators can quickly assign and change roles
4. **Visual Clarity**: Clear indication of each member's role and status
5. **Validation**: Prevents role conflicts and maintains team structure

## Example Scenarios

**Multi-Team User**:
- User A is "Captain" of Team Alpha
- Same User A is "Coach" of Team Beta
- User A is regular "Member" of Team Gamma

**Role Changes**:
- Admin can promote Member to Co-Captain
- Admin can change Coach to Coordinator
- Admin can grant/remove administrative privileges independently

This system provides the flexibility needed for users who participate in multiple teams with different responsibilities on each team.