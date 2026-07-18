import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";
import type {
  TaskSummary,
  TaskDetail,
  TaskListResponse,
} from "./types";

export async function getTodayTasks(): Promise<TaskSummary[]> {
  const response = await client.get<TaskListResponse>(
    apiUrl("/tasks"),
    { params: { filter: "today", assignedTo: "me" } }
  );
  return response.data.tasks;
}

export async function getScheduledTasks(): Promise<TaskSummary[]> {
  const response = await client.get<TaskListResponse>(
    apiUrl("/tasks"),
    { params: { filter: "scheduled", assignedTo: "me" } }
  );
  return response.data.tasks;
}

export async function getTaskDetail(id: string): Promise<TaskDetail> {
  const response = await client.get<TaskDetail>(
    apiUrl(`/tasks/${id}`)
  );
  return response.data;
}

export async function startTask(id: string, updatedAt: string): Promise<TaskDetail> {
  const response = await client.post<TaskDetail>(
    apiUrl(`/tasks/${id}/start`),
    { updatedAt }
  );
  return response.data;
}

export async function completeTask(id: string, updatedAt: string): Promise<TaskDetail> {
  const response = await client.post<TaskDetail>(
    apiUrl(`/tasks/${id}/complete`),
    { updatedAt }
  );
  return response.data;
}

export async function updateTaskLine(
  taskId: string,
  lineId: string,
  completedQuantity: number
): Promise<TaskDetail> {
  const response = await client.patch<TaskDetail>(
    apiUrl(`/tasks/${taskId}/lines/${lineId}`),
    { completedQuantity }
  );
  return response.data;
}
