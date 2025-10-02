// src/api/mockApi.ts
// Mock data + simple functions to simulate API calls

export interface ClothingItem {
    id: string;
    name: string;
    price: number;
    sizes: string[];
    images: (string | number)[];
    stock: Record<string, number>;
  }
  
  export const mockClothingItems: ClothingItem[] = [
    {
      id: "1",
      name: "Classic White Shirt",
      price: 499,
      sizes: ["S", "M", "L", "XL"],
      images: ["https://via.placeholder.com/300x400.png?text=White+Shirt"],
      stock: { S: 10, M: 8, L: 5, XL: 2 }
    },
    {
      id: "2",
      name: "Denim Jacket",
      price: 1299,
      sizes: ["M", "L", "XL"],
      images: ["https://via.placeholder.com/300x400.png?text=Denim+Jacket"],
      stock: { M: 5, L: 3, XL: 1 }
    }
  ];
  
  export async function loginUser(email: string, password: string) {
    await new Promise((res) => setTimeout(res, 800));
    if (email === "test@example.com" && password === "123456") {
      return {
        user: {
          _id: "mock-user-id",
          name: "Test User",
          email: "test@example.com",
          phone: undefined,
          address: undefined,
          isAdmin: false,
          isGuest: false,
          profileComplete: true
        },
        token: "fake-jwt-token"
      };
    }
    throw new Error("Invalid email or password");
  }

  export async function registerUser(data: Record<string, any>) {
    await new Promise((res) => setTimeout(res, 1000));
    return {
      user: {
        _id: "mock-user-id-" + Date.now(),
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        address: data.address || undefined,
        isAdmin: false,
        isGuest: false,
        profileComplete: !!data.address // Profile is complete if address is provided
      },
      token: "fake-jwt-token-" + Date.now()
    };
  }
  
  export async function getClothingItems() {
    await new Promise((res) => setTimeout(res, 500));
    return mockClothingItems;
  }
  
  export async function placeOrder(orderData: any) {
    await new Promise((res) => setTimeout(res, 1500));
    return { orderId: Math.floor(Math.random() * 1000000), ...orderData };
  }

  export async function getBusinessLocation() {
    await new Promise((res) => setTimeout(res, 500));
    return {
      latitude: 13.359253894021206,
      longitude: 123.73175740972958,
      address: "J. B. Berces St, Tabaco City, Albay, Philippines",
      name: "BEGINO'S TAILORING"
    };
  }
  