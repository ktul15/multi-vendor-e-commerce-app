import "server-only";

import { ApiClientError, createApiClient } from "@repo/api-client";
import type { components } from "@repo/api-client";
import { cookies } from "next/headers";
import type { UserListState } from "./user-list-state";
import { userListQuery } from "./user-list-state";

export type AdminUser = components["schemas"]["AdminUserSummary"];
export type AdminUserDetail = components["schemas"]["AdminUserDetail"];
export type AdminUsers = components["schemas"]["AdminUsersSuccess"]["data"];

export class UserDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "UserDataError";
    this.status = status;
  }
}

async function userClient() {
  const accessToken = (await cookies()).get("admin_access_token")?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!accessToken || !apiBaseUrl) throw new UserDataError("User service is unavailable", 503);
  return createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken });
}

function dataError(error: unknown, fallback: string): never {
  if (error instanceof ApiClientError) throw new UserDataError(error.message, error.status);
  if (error instanceof UserDataError) throw error;
  throw new UserDataError(fallback);
}

export async function getAdminUsers(state: UserListState): Promise<AdminUsers> {
  try {
    const client = await userClient();
    const { data } = await client.GET("/admin/users", {
      params: { query: userListQuery(state) },
    });
    if (!data) throw new UserDataError("Users response is empty");
    return data.data as AdminUsers;
  } catch (error) {
    dataError(error, "Users could not be loaded");
  }
}

export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  try {
    const client = await userClient();
    const { data } = await client.GET("/admin/users/{userId}", {
      params: { path: { userId } },
    });
    if (!data) throw new UserDataError("User response is empty");
    return data.data;
  } catch (error) {
    dataError(error, "User details could not be loaded");
  }
}
