# ClothAR Admin Side Documentation

## Overview

ClothAR is a comprehensive clothing e-commerce platform with integrated Augmented Reality (AR) virtual try-on capabilities. This documentation focuses on the admin side of the system, which provides shop owners and administrators with powerful tools to manage their business operations.

## System Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Supabase      │    │   AR Engine     │
│   Mobile App    │◄──►│   Backend       │◄──►│   (TensorFlow)  │
│                 │    │   Database      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Customer      │    │   Admin         │    │   AR Overlay    │
│   Interface     │    │   Dashboard     │    │   Rendering     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AR Engine**: TensorFlow.js with MoveNet pose detection
- **State Management**: React Context
- **Navigation**: React Navigation
- **UI Components**: React Native Paper

## Admin Dashboard

### Overview Screen

The admin dashboard provides a comprehensive overview of business operations:

#### Key Metrics Displayed:
- **Total Users**: Active customer count
- **Total Orders**: All-time order volume
- **Pending Orders**: Orders requiring attention
- **Total Products**: Active product catalog size
- **Low Stock Items**: Products below threshold
- **Total Revenue**: ₱ formatted revenue figure

#### Quick Access Functions:
1. **Product Management** - Add, edit, and manage products
2. **Fabric Management** - Manage fabric types and pricing
3. **Order Management** - Complete order oversight
4. **Inventory Management** - Stock and inventory control
5. **Customer Management** - Customer database and communication
6. **Analytics** - Business insights and reporting

### Navigation Flow

```
Admin Login → Dashboard → [Function Selection] → [Specific Management Screen]
```

## Product Management

### Features

#### Product CRUD Operations:
- **Create**: Add new products with categories, pricing, and images
- **Read**: View product details and specifications
- **Update**: Edit product information and status
- **Delete**: Remove products with confirmation

#### Product Categories:
- Shirts, Pants, Dresses, Jackets, Skirts, Blouses

#### Product Status Management:
- **Active/Inactive Toggle**: Control product visibility
- **Stock Management**: Update inventory levels
- **Category Filtering**: Filter by product type

### Workflow

```
1. Access Product Management
2. Search/Filter products
3. Select product for editing
4. Modify details/status
5. Save changes
6. View updated catalog
```

## Order Management

### Order Lifecycle

#### Order Status Flow:
```
Pending → Confirmed → Processing → Tailoring → Quality Check → Ready for Delivery → Shipped → Delivered
```

#### Status Management:
- **Advance Status**: Move orders through workflow
- **Payment Verification**: Check payment status
- **Tailoring Requirements**: Flag custom orders
- **Customer Communication**: Update order status

### Order Details View

#### Information Displayed:
- **Order Number**: Unique identifier
- **Customer Information**: Name and contact details
- **Order Items**: Quantity and products
- **Payment Status**: Paid/Pending
- **Order Timeline**: Status history
- **Total Amount**: ₱ formatted pricing

#### Actions Available:
- **View Details**: Complete order information
- **Update Status**: Advance through workflow
- **Contact Customer**: Initiate communication

### Filtering and Search

#### Filter Options:
- **All Orders**: Complete order history
- **Pending/Confirmed**: Early stage orders
- **Processing/Tailoring**: Active orders
- **Quality Check**: Final review stage

#### Search Capabilities:
- Order number search
- Customer name search
- Date range filtering

## Customer Management

### Customer Database

#### Customer Information:
- **Profile Data**: Name, email, phone, location
- **Role Status**: Customer, Tailor, Shop Owner
- **Registration Date**: Account creation timestamp
- **Order History**: Purchase statistics

#### Customer Statistics:
- **Total Orders**: Lifetime purchase count
- **Total Spent**: ₱ formatted revenue contribution
- **Last Order Date**: Most recent purchase
- **Account Status**: Active/Inactive status

### Role Management

#### User Roles:
- **Customer**: Standard user with purchase capabilities
- **Tailor**: Approved service provider
- **Shop Owner**: Administrative access

#### Role Approval Process:
```
Registration → Pending → Admin Review → Approved/Rejected
```

### Customer Communication

#### Communication Channels:
- **Chat System**: Real-time messaging
- **Email Integration**: Direct email contact
- **Phone Calls**: Direct dialing capability

#### Chat Features:
- **Unread Message Badges**: Visual notification indicators
- **Conversation History**: Complete message threads
- **Admin Response System**: Dedicated admin chat interface

## Fabric Management

### Fabric Catalog

#### Fabric Properties:
- **Material Composition**: Fabric type and blend
- **Care Instructions**: Washing and maintenance guidelines
- **Price per Meter**: ₱ formatted pricing
- **Usage Statistics**: Products using this fabric

#### Fabric Analytics:
- **Usage Count**: Number of products using fabric
- **Total Orders**: Orders containing this fabric
- **Revenue Generated**: ₱ formatted contribution

### Fabric Operations

#### CRUD Operations:
- **Add Fabric**: Create new fabric types
- **Edit Details**: Update specifications and pricing
- **Activate/Deactivate**: Control availability
- **Delete**: Remove unused fabrics

#### Analytics Dashboard:
- **Performance Metrics**: Usage and revenue tracking
- **Trend Analysis**: Fabric popularity over time
- **Inventory Integration**: Stock level monitoring

## Inventory Management

### Stock Control

#### Inventory Tracking:
- **Product Variants**: Size, color, SKU combinations
- **Stock Levels**: Current quantity available
- **Low Stock Alerts**: Threshold-based notifications
- **Stock History**: Movement tracking

#### Stock Operations:
- **Update Stock**: Manual quantity adjustments
- **Stock Alerts**: Low stock notifications
- **Availability Toggle**: Enable/disable products
- **Bulk Updates**: Multiple item modifications

### Inventory Filters

#### Filter Categories:
- **All Items**: Complete inventory view
- **Low Stock**: Items below threshold
- **Out of Stock**: Zero quantity items
- **By Category**: Product type filtering

## AR/Virtual Try-on System

### Technical Implementation

#### AR Engine Components:
- **Camera Integration**: Expo Camera for device access
- **Pose Detection**: TensorFlow.js MoveNet model
- **Image Processing**: Real-time overlay rendering
- **Body Landmark Tracking**: 17-point pose estimation

#### ML Pipeline:
```
Camera Frame → Pose Detection → Landmark Extraction → Overlay Calculation → Render
```

### AR Features

#### Virtual Try-on Capabilities:
- **Real-time Pose Detection**: ML-based body tracking
- **Clothing Overlay**: 2D image superposition
- **Scale Adjustment**: Size matching based on pose
- **Position Optimization**: Landmark-based placement

#### Clothing Categories Supported:
- **Tops**: Shirts, blouses, jackets
- **Bottoms**: Pants, skirts
- **Dresses**: Full-body garments
- **Outerwear**: Coats and jackets

### AR Settings and Controls

#### Camera Controls:
- **Flash Modes**: Off, On, Auto
- **Camera Toggle**: Front/Rear camera switching
- **Zoom Control**: Digital zoom functionality

#### AR-Specific Settings:
- **Grid Overlay**: Alignment assistance
- **Landmark Visualization**: Pose detection feedback
- **Clothing Opacity**: Transparency adjustment
- **Scale Calibration**: Size matching controls

### AR Workflow

#### User Experience Flow:
```
1. Launch Camera → 2. Grant Permissions → 3. Pose Detection → 4. Select Clothing → 5. Apply Overlay → 6. Capture/Share
```

#### Technical Process:
1. **Camera Initialization**: Device camera access
2. **ML Model Loading**: TensorFlow.js initialization
3. **Pose Estimation**: Real-time body tracking
4. **Clothing Selection**: Product catalog integration
5. **Overlay Rendering**: Position and scale calculation
6. **Image Capture**: AR result saving

## Security and Authentication

### Admin Access Control

#### Authentication Levels:
- **Shop Owner**: Full administrative access
- **Tailor**: Limited product/service management
- **Customer**: Standard user access

#### Security Features:
- **Role-based Access**: Permission-based functionality
- **Session Management**: Secure login sessions
- **Audit Logging**: Administrative action tracking
- **Account Lockout**: Failed login protection

### Data Protection

#### Security Measures:
- **Row Level Security (RLS)**: Database-level access control
- **Encrypted Communications**: HTTPS/TLS encryption
- **Input Validation**: SQL injection prevention
- **Rate Limiting**: Brute force attack protection

## Database Schema

### Core Tables

#### User Management:
- **profiles**: User information and roles
- **otp_verifications**: Phone verification system
- **audit_logs**: Security event tracking
- **login_attempts**: Authentication monitoring

#### Business Operations:
- **products**: Product catalog
- **product_variants**: Size/color combinations
- **orders**: Order management
- **order_items**: Order line items
- **fabric_types**: Fabric catalog

#### Communication:
- **chat_conversations**: Customer-admin messaging
- **chat_messages**: Message threads

## Performance Optimization

### Mobile App Optimizations:
- **Lazy Loading**: Component-based loading
- **Image Optimization**: Compressed asset delivery
- **Caching**: Local data storage
- **Background Processing**: Non-blocking operations

### AR Performance:
- **Model Optimization**: Lightweight ML models
- **Frame Rate Management**: 30fps target
- **Memory Management**: Resource cleanup
- **Battery Optimization**: Efficient processing

## Future Enhancements

### Planned Features:
- **3D Model Support**: Advanced AR rendering
- **Social Sharing**: AR result sharing
- **Size Recommendation**: ML-based sizing
- **Multi-user AR**: Collaborative try-on
- **Advanced Analytics**: Business intelligence dashboard

### Technical Improvements:
- **Real-time Collaboration**: Multi-user sessions
- **Cloud Processing**: Server-side ML inference
- **Advanced Pose Detection**: More accurate tracking
- **Custom Model Training**: Brand-specific clothing

## Conclusion

The ClothAR admin system provides comprehensive business management capabilities with cutting-edge AR technology. The modular architecture supports easy expansion and the ML-powered virtual try-on feature differentiates it from traditional e-commerce platforms.

The combination of robust admin tools, real-time AR capabilities, and secure architecture makes ClothAR a complete solution for modern clothing businesses.