import { User, CreateUserInput, UpdateUserInput, UserRole, UserStatus, ContractType } from "@/types";
import { UserModel } from "@/server/models/user.model";

export const userService = {
  async getAll(params?: {
    role?: UserRole;
    search?: string;
    status?: UserStatus;
    contractType?: ContractType;
    page?: number;
    limit?: number;
  }) {
    return UserModel.findAll(params);
  },

  async getById(id: string): Promise<User | null> {
    return UserModel.findById(id);
  },

  async create(input: CreateUserInput): Promise<User> {
    return UserModel.create(input);
  },

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    return UserModel.update(id, input);
  },

  async delete(id: string): Promise<boolean> {
    return UserModel.delete(id);
  },
};
