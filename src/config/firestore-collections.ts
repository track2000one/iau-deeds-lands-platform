// Firestore Collections Structure
// This file defines the collection names used in the application

export const COLLECTIONS = {
  // Main collections
  DEEDS: 'deeds',
  ALLOCATED_LANDS: 'allocatedLands',
  DELIVERED_LANDS: 'deliveredLands',
  LEASED_LANDS_OUT: 'leasedLandsOut',
  LEASED_LANDS_IN: 'leasedLandsIn',
  LEASED_BUILDINGS_OUT: 'leasedBuildingsOut',
  LEASED_BUILDINGS_IN: 'leasedBuildingsIn',
  
  // User management
  USERS: 'users',
  PERMISSIONS: 'permissions',
  
  // Attachments (metadata, actual files stored in Firebase Storage)
  ATTACHMENTS: 'attachments',
} as const;

// Firestore indexes required for queries
// Run these in Firebase Console > Firestore > Indexes
export const REQUIRED_INDEXES = `
# Compound Indexes Required:

## For deeds collection
- Collection: deeds
  Fields: createdAt (Descending)
  
- Collection: deeds  
  Fields: city (Ascending), createdAt (Descending)
  
- Collection: deeds
  Fields: isPlanned (Ascending), createdAt (Descending)

## For allocated lands
- Collection: allocatedLands
  Fields: city (Ascending), createdAt (Descending)

## For delivered lands  
- Collection: deliveredLands
  Fields: recipientEntity (Ascending), createdAt (Descending)

## For leased lands/buildings
- Collection: leasedLandsOut
  Fields: tenant.name (Ascending), createdAt (Descending)
  
- Collection: leasedLandsIn
  Fields: owner.name (Ascending), createdAt (Descending)
`;
