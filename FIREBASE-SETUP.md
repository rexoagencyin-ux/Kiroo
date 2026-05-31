# Firebase Setup — Modern Shop (no backend needed)

Auth, products, orders and image uploads all run on Firebase directly from the browser. Do this **one-time** setup in the [Firebase Console](https://console.firebase.google.com) for project **`mordenshopauth`**.

## 1. Authentication
- **Build → Authentication → Get started**
- **Sign-in method** → enable **Email/Password** and **Google**
- **Settings → Authorized domains** → add your Vercel domain (e.g. `kiroo-xxx.vercel.app`) and keep `localhost`
- Create the admin: sign up on the site with **`rexoagency.in@gmail.com` / `Mm12345@`** (this email is automatically the admin → can open `/admin`)

## 2. Firestore Database
- **Build → Firestore Database → Create database** → Start (any region, e.g. `asia-south1`)
- **Rules** tab → paste this and **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
             request.auth.token.email.lower() == 'rexoagency.in@gmail.com';
    }
    // Products: anyone can read; only admin can write
    match /products/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
    // Orders: a signed-in user can create & read their own; admin can do everything
    match /orders/{id} {
      allow create: if request.auth != null;
      allow read, update, delete: if isAdmin()
        || (request.auth != null && resource.data.user_id == request.auth.uid);
    }
  }
}
```

## 3. Storage (product images)
- **Build → Storage → Get started**
- **Rules** tab → paste this and **Publish**:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{file=**} {
      allow read: if true;
      allow write: if request.auth != null &&
                      request.auth.token.email.lower() == 'rexoagency.in@gmail.com';
    }
  }
}
```

> Quick test option: while developing you can use **Test mode** (open read/write for 30 days) instead of the rules above, then lock it down later.

## 4. Done
- Log in as the admin → `/admin/products` → **Add Product** (upload images, set price/stock) → it saves to Firestore and appears on the storefront **instantly**.
- Customers can browse, add to cart, and place **Cash on Delivery** orders → visible in **/admin/orders** in real time.

## What still needs the separate Node/Express backend (optional, later)
- Online card/UPI payments via **Razorpay** (needs server-side signature verification)
- **Shiprocket** shipping labels, server-side **email** sending, coupons/banners/reviews admin tables
Deploy `backend/` as a second project and set `NEXT_PUBLIC_API_URL` to enable those.
