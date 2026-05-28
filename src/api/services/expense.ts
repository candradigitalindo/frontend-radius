import http from '../http'

export const expenseApi = {
  categories: () => http.get('/expense-categories'),
  createCategory: (data: Record<string, any>) => http.post('/expense-categories', data),
  updateCategory: (id: string, data: Record<string, any>) => http.put(`/expense-categories/${id}`, data),
  deleteCategory: (id: string) => http.delete(`/expense-categories/${id}`),
  list: (params?: Record<string, any>) => http.get('/expenses', { params }),
  summary: (params?: Record<string, any>) => http.get('/expenses/summary', { params }),
  create: (data: Record<string, any>) => http.post('/expenses', data),
  update: (id: string, data: Record<string, any>) => http.put(`/expenses/${id}`, data),
  delete: (id: string) => http.delete(`/expenses/${id}`),
}
