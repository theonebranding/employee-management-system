import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
console.log('Connecting to database:', MONGO_URL);

async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to DB:', mongoose.connection.db.databaseName);

    const collection = mongoose.connection.db.collection('leavetemplateassignments');
    const indexes = await collection.listIndexes().toArray();
    console.log('Current indexes on leavetemplateassignments:', JSON.stringify(indexes, null, 2));

    // Find the unique index that is only on the 'employee' field
    const employeeUniqueIndex = indexes.find((index) => {
      const keys = Object.keys(index.key);
      return keys.length === 1 && keys[0] === 'employee' && index.unique;
    });

    if (employeeUniqueIndex) {
      console.log(
        `Found obsolete unique index on 'employee': ${employeeUniqueIndex.name}. Dropping it...`
      );
      await collection.dropIndex(employeeUniqueIndex.name);
      console.log('Index dropped successfully!');
    } else {
      console.log("No unique index on 'employee' found (or it has already been dropped).");
    }

    const updatedIndexes = await collection.listIndexes().toArray();
    console.log(
      'Updated indexes on leavetemplateassignments:',
      JSON.stringify(updatedIndexes, null, 2)
    );
  } catch (error) {
    console.error('Error running migration script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB.');
  }
}

main();
