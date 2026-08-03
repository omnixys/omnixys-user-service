import type { Employee } from '../../../prisma/generated/client.js';
import type { EmployeePayload } from '../payload/employee.payload.js';
import { n2u } from '@omnixys/contracts-ts';

export class EmployeeMapper {
  static toPayload(employee: Employee): EmployeePayload {
    return {
      id: employee.id,
      department: n2u(employee.department),
      position: n2u(employee.position),
      role: n2u(employee.role),
      salary: n2u(employee.salary),
      hireDate: n2u(employee.hireDate),
      isExternal: employee.isExternal,
      updatedAt: employee.updatedAt,
      createdAt: employee.createdAt,
    };
  }
}
