// src/api/mockApi.ts
// Mock data + simple functions to simulate API calls

export interface ClothingItem {
    id: string;
    name: string;
    price: number;
    sizes: string[];
    image: string;
    stock: Record<string, number>;
  }
  
  export const mockClothingItems: ClothingItem[] = [
    {
      id: "1",
      name: "Classic White Shirt",
      price: 499,
      sizes: ["S", "M", "L", "XL"],
      image: "https://via.placeholder.com/300x400.png?text=White+Shirt",
      stock: { S: 10, M: 8, L: 5, XL: 2 }
    },
    {
      id: "2",
      name: "Denim Jacket",
      price: 1299,
      sizes: ["M", "L", "XL"],
      image: "https://via.placeholder.com/300x400.png?text=Denim+Jacket",
      stock: { M: 5, L: 3, XL: 1 }
    }
  ];
  
  export async function loginUser(email: string, password: string) {
    await new Promise((res) => setTimeout(res, 800));
    if (email === "test@example.com" && password === "123456") {
      return { token: "fake-jwt-token", name: "Test User" };
    }
    throw new Error("Invalid email or password");
  }
  
  export async function registerUser(data: Record<string, any>) {
    await new Promise((res) => setTimeout(res, 1000));
    return { success: true };
  }
  
  export async function getClothingItems() {
    await new Promise((res) => setTimeout(res, 500));
    return mockClothingItems;
  }
  
  export async function placeOrder(orderData: any) {
    await new Promise((res) => setTimeout(res, 1500));
    return { orderId: Math.floor(Math.random() * 1000000), ...orderData };
  }
  