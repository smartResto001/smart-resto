import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const Role = {
  ADMIN: 'ADMIN',
  WAITER: 'WAITER',
  KITCHEN: 'KITCHEN',
  CASHIER: 'CASHIER',
} as const;

export const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  CLEANING: 'CLEANING',
} as const;

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clear existing data
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.notification.deleteMany();

  // 2. Create Default Staff Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Chef Admin',
      email: 'admin@restaurant.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const waiter = await prisma.user.create({
    data: {
      name: 'Alex Waiter',
      email: 'waiter@restaurant.com',
      password: hashedPassword,
      role: Role.WAITER,
    },
  });

  const kitchen = await prisma.user.create({
    data: {
      name: 'Gordon Chef',
      email: 'kitchen@restaurant.com',
      password: hashedPassword,
      role: Role.KITCHEN,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: 'Sarah Cashier',
      email: 'cashier@restaurant.com',
      password: hashedPassword,
      role: Role.CASHIER,
    },
  });

  console.log('✅ Staff users created.');

  // 3. Create Tables
  const tableData = [
    { tableNumber: 1, capacity: 2, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 2, capacity: 2, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 3, capacity: 4, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 4, capacity: 4, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 5, capacity: 4, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 6, capacity: 6, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 7, capacity: 6, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 8, capacity: 8, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 9, capacity: 8, status: TableStatus.AVAILABLE, userId: admin.id },
    { tableNumber: 10, capacity: 10, status: TableStatus.AVAILABLE, userId: admin.id },
  ];

  for (const t of tableData) {
    await prisma.table.create({ data: t });
  }

  console.log('✅ 10 Tables created.');

  // 4. Create Food Categories & Items
  const starters = await prisma.category.create({
    data: {
      name: 'Starters',
      description: 'Appetizers and quick bites to spark your appetite',
    },
  });

  const mainCourse = await prisma.category.create({
    data: {
      name: 'Main Course',
      description: 'Hearty full meals crafted with premium spices',
    },
  });

  const desserts = await prisma.category.create({
    data: {
      name: 'Desserts',
      description: 'Sweet tooth treats and post-meal delights',
    },
  });

  const drinks = await prisma.category.create({
    data: {
      name: 'Drinks & Beverages',
      description: 'Refreshing cold drinks, mocktails & hot beverages',
    },
  });

  const foodItems = [
    // Starters
    {
      name: 'Paneer Tikka Platter',
      description: 'Cottage cheese cubes marinated in spiced yogurt and grilled in a clay oven',
      price: 280,
      prepTime: 15,
      isVeg: true,
      availability: true,
      categoryId: starters.id,
      image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Crispy Chicken Wings',
      description: 'Deep-fried spicy wings tossed in signature BBQ hot sauce',
      price: 340,
      prepTime: 15,
      isVeg: false,
      availability: true,
      categoryId: starters.id,
      image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Crispy Spring Rolls',
      description: 'Golden fried rolls stuffed with shredded vegetables and sweet chili dip',
      price: 220,
      prepTime: 12,
      isVeg: true,
      availability: true,
      categoryId: starters.id,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
    },
    // Main Course
    {
      name: 'Butter Chicken Special',
      description: 'Tender chicken cooked in rich tomato gravy with real butter and cream',
      price: 420,
      prepTime: 20,
      isVeg: false,
      availability: true,
      categoryId: mainCourse.id,
      image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Paneer Butter Masala',
      description: 'Fresh cottage cheese cooked in creamy tomato cashew gravy',
      price: 360,
      prepTime: 18,
      isVeg: true,
      availability: true,
      categoryId: mainCourse.id,
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Hyderabadi Dum Biryani',
      description: 'Fragrant long-grain basmati rice layered with spiced chicken and caramelised onions',
      price: 390,
      prepTime: 25,
      isVeg: false,
      availability: true,
      categoryId: mainCourse.id,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Garlic Naan Basket',
      description: 'Fluffy clay oven bread infused with roasted garlic and fresh butter',
      price: 70,
      prepTime: 8,
      isVeg: true,
      availability: true,
      categoryId: mainCourse.id,
      image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80',
    },
    // Desserts
    {
      name: 'Sizzling Chocolate Brownie',
      description: 'Warm fudge brownie topped with vanilla ice cream and hot fudge',
      price: 240,
      prepTime: 10,
      isVeg: true,
      availability: true,
      categoryId: desserts.id,
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Gulab Jamun with Ice Cream',
      description: 'Warm milk dumplings soaked in cardamom sugar syrup with vanilla bean ice cream',
      price: 180,
      prepTime: 8,
      isVeg: true,
      availability: true,
      categoryId: desserts.id,
      image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=80',
    },
    // Drinks
    {
      name: 'Fresh Mint Mojito',
      description: 'Cooling drink made with crushed mint leaves, fresh lime juice, and sparkling soda',
      price: 160,
      prepTime: 5,
      isVeg: true,
      availability: true,
      categoryId: drinks.id,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Mango Lassi',
      description: 'Traditional thick yogurt drink blended with sweet Alphonso mangoes',
      price: 140,
      prepTime: 5,
      isVeg: true,
      availability: true,
      categoryId: drinks.id,
      image: 'https://images.unsplash.com/photo-1553787499-6f9133860278?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Cold Coffee with Ice Cream',
      description: 'Creamy espresso shake topped with a scoop of vanilla ice cream and chocolate drizzle',
      price: 190,
      prepTime: 6,
      isVeg: true,
      availability: true,
      categoryId: drinks.id,
      image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
    },
  ];

  for (const item of foodItems) {
    await prisma.foodItem.create({ data: item });
  }

  console.log('✅ Food categories & items seeded.');
  console.log('🎉 Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
