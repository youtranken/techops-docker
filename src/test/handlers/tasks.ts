import { http, HttpResponse } from "msw";

export const handlers = [
  // GET /api/tasks - list tasks
  http.get("/api/tasks", () => {
    return HttpResponse.json({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
  }),
];