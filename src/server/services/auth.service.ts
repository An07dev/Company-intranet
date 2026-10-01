import { User, LoginPayload, AuthSession } from "@/types";
import { signAuthToken, verifyAuthToken, JwtPayload } from "@/server/utils/auth";
import { UserModel, verifyPassword, toSafeUser } from "@/server/models/user.model";

export const authService = {
  /**
   * Đăng nhập xác thực tài khoản dựa trên UserModel DB
   */
  async login(payload: LoginPayload): Promise<AuthSession> {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();

    const userDoc = await UserModel.findDocumentByEmail(email);

    if (!userDoc) {
      throw new Error("Email hoặc mật khẩu không chính xác.");
    }

    if (userDoc.status !== "active") {
      throw new Error("Tài khoản của bạn đang bị khóa hoặc tạm ngưng.");
    }

    const isValidPassword = verifyPassword(password, userDoc.passwordHash, userDoc.salt);
    if (!isValidPassword) {
      throw new Error("Email hoặc mật khẩu không chính xác.");
    }

    const durationSeconds = payload.rememberMe ? 86400 * 30 : 86400 * 1; // 30 ngày hoặc 1 ngày

    const token = signAuthToken(
      {
        userId: userDoc.id,
        employeeCode: userDoc.employeeCode,
        email: userDoc.email,
        name: userDoc.name,
        role: userDoc.role,
        department: userDoc.department,
      },
      durationSeconds
    );

    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

    return {
      user: toSafeUser(userDoc),
      token,
      expiresAt,
    };
  },

  /**
   * Xác thực token và lấy thông tin user từ DB
   */
  async getUserByToken(token: string): Promise<User | null> {
    const payload: JwtPayload | null = verifyAuthToken(token);
    if (!payload) return null;

    const user = await UserModel.findById(payload.userId);
    return user;
  },

  /**
   * Danh sách tài khoản mẫu 4 Roles để test nhanh
   */
  getDemoAccounts() {
    return [
      {
        role: "admin",
        label: "Admin",
        name: "Nguyễn Văn Admin",
        email: "admin@company.internal",
        samplePassword: "admin123",
        department: "Ban Công Nghệ & Quản Trị Hệ Thống",
      },
      {
        role: "director",
        label: "Giám Đốc",
        name: "Trịnh Gia Giám Đốc",
        email: "director@company.internal",
        samplePassword: "director123",
        department: "Ban Giám Đốc",
      },
      {
        role: "manager",
        label: "Quản Lý",
        name: "Trần Thị Quản Lý",
        email: "manager@company.internal",
        samplePassword: "manager123",
        department: "Phòng Kỹ Thuật & Vận Hành",
      },
      {
        role: "employee",
        label: "Nhân Viên",
        name: "Lê Hoàng Nhân Viên",
        email: "employee@company.internal",
        samplePassword: "employee123",
        department: "Bộ Phận Phát Triển Sản Phẩm",
      },
    ];
  },
};
