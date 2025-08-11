# GitHub Pages Starter (VI)
Hướng dẫn nhanh:
1. Tạo repo trên GitHub (có thể đặt tên `username.github.io` để làm *User Site*).
2. Commit & push toàn bộ files trong thư mục này lên branch `main`.
3. Bật Pages: Settings → Pages → Build and deployment → Source = `Deploy from a branch`, Branch = `main` / `/ (root)`.
4. Truy cập link hiển thị sau khi bật Pages.

Tùy chọn:
- Nếu là SPA (React/Vue), giữ `404.html` để hỗ trợ reload ở các route con.
- Nếu có thư mục `docs/`, bạn có thể đặt build output vào đó và trỏ Pages tới `/docs`.
- Nếu dùng custom domain, tạo file `CNAME` chứa domain và trỏ DNS về GitHub Pages (CNAME đến `username.github.io`).
