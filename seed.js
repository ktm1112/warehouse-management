const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/storageDB');

const SpaceSchema = new mongoose.Schema({
  id: Number,
  name: String,
  status: String,
  item: String
});

const Space = mongoose.model('Space', SpaceSchema);

async function seed() {
  await Space.deleteMany();

  await Space.insertMany([
    { id: 1, name: "A1", status: "free", item: null },
    { id: 2, name: "A2", status: "free", item: null },
    { id: 3, name: "B1", status: "free", item: null },
    { id: 4, name: "B2", status: "free", item: null }
  ]);

  console.log("Seed complete");
  process.exit();
}

seed();