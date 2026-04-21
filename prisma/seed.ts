import { PrismaClient, WorkflowMode, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── ADMIN PASSWORD ─────────────────────────���────────────────────────────────
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    console.error("❌ ADMIN_INITIAL_PASSWORD env var không được đặt hoặc quá ngắn (min 8 ký tự).");
    console.error("   Đặt trong .env: ADMIN_INITIAL_PASSWORD=<password mạnh>");
    process.exit(1);
  }

  // ─── ROLES ──────────────────────────────────────────────────────────────────

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      label: "Quản trị viên",
      isSystem: true,
    },
  });

  const bossRole = await prisma.role.upsert({
    where: { name: "BOSS" },
    update: {},
    create: {
      name: "BOSS",
      label: "Quản lý",
      isSystem: true,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: "EMPLOYEE" },
    update: {},
    create: {
      name: "EMPLOYEE",
      label: "Nhân viên",
      isSystem: true,
    },
  });

  console.log("✅ Roles created");

  // ─── USERS ──────────────────────────────────────────────────────────────────

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: await bcrypt.hash(adminPassword, 10),
      displayName: "Administrator",
      email: "admin@techops.com",
      roleId: adminRole.id,
      isActive: true,
      mustChangePassword: true, // Force đổi password lần đầu đăng nhập
    },
  });


  console.log("✅ Users created");

  // ─── PRIORITIES ─────────────────────────────────────────────────────────────

  const priorities = [
    { name: "Khẩn cấp", color: "#EF4444", level: 4, isDefault: false },
    { name: "Cao", color: "#F97316", level: 3, isDefault: false },
    { name: "Bình thường", color: "#3B82F6", level: 2, isDefault: true },
    { name: "Thấp", color: "#6B7280", level: 1, isDefault: false },
  ];

  for (const p of priorities) {
    await prisma.priority.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }

  console.log("✅ Priorities created");

  // ─── TASK TYPES ─────────────────────────────────────────────────────────────

  const taskTypes = [
    {
      name: "Phần mềm",
      color: "#3B82F6",
      description: "Các vấn đề liên quan đến phần mềm",
    },
    {
      name: "Phần cứng",
      color: "#8B5CF6",
      description: "Các vấn đề liên quan đến phần cứng",
    },
    {
      name: "Mạng",
      color: "#10B981",
      description: "Các vấn đề liên quan đến mạng",
    },
    {
      name: "Phát triển",
      color: "#F59E0B",
      description: "Các công việc phát triển tính năng mới",
    },
    {
      name: "Khác",
      color: "#6B7280",
      description: "Các công việc khác",
    },
  ];

  for (const t of taskTypes) {
    await prisma.taskType.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  console.log("✅ Task types created");

  // ─── PERMISSIONS ────────────────────────────────────────────────────────────

  const permissionDefs = [
    { resource: "TASK", action: "CREATE" },
    { resource: "TASK", action: "READ" },
    { resource: "TASK", action: "UPDATE" },
    { resource: "TASK", action: "DELETE" },
    { resource: "TASK", action: "VIEW_ALL" },
    { resource: "TASK", action: "APPROVE" },
    { resource: "TASK", action: "REJECT" },
    { resource: "TASK", action: "TRANSFER" },
    { resource: "TASK", action: "CANCEL" },
    { resource: "USER", action: "VIEW" },
    { resource: "USER", action: "MANAGE" },
    { resource: "USER", action: "DELETE" },
    { resource: "LOG", action: "VIEW" },
    { resource: "LOG", action: "EXPORT" },
    { resource: "ANALYTICS", action: "VIEW" },
    { resource: "HELPDESK", action: "VIEW" },
    { resource: "HELPDESK", action: "MANAGE" },
    { resource: "SETTINGS", action: "VIEW" },
    { resource: "SETTINGS", action: "MANAGE" },
  ];

  const permissionsMap: Record<string, string> = {};

  for (const pDef of permissionDefs) {
    const perm = await prisma.permission.upsert({
      where: { resource_action: { resource: pDef.resource, action: pDef.action } },
      update: {},
      create: pDef,
    });
    permissionsMap[`${pDef.resource}:${pDef.action}`] = perm.id;
  }

  console.log("✅ Permissions created");

  // ─── ROLE PERMISSIONS ───────────────────────────────────────────────────────

  // ADMIN: All permissions
  for (const permId of Object.values(permissionsMap)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: permId },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: permId },
    });
  }

  // BOSS: All except USER:DELETE
  const bossExclude = ["USER:DELETE"];
  for (const [key, permId] of Object.entries(permissionsMap)) {
    if (!bossExclude.includes(key)) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: bossRole.id, permissionId: permId },
        },
        update: {},
        create: { roleId: bossRole.id, permissionId: permId },
      });
    }
  }

  // EMPLOYEE: Basic task access
  const employeePerms = [
    "TASK:CREATE",
    "TASK:READ",
    "TASK:UPDATE",
    "TASK:CANCEL",
    "TASK:TRANSFER",
  ];
  for (const key of employeePerms) {
    const permId = permissionsMap[key];
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: employeeRole.id,
            permissionId: permId,
          },
        },
        update: {},
        create: { roleId: employeeRole.id, permissionId: permId },
      });
    }
  }

  console.log("✅ Role permissions assigned");

  // ─── ROLE STATUS ACTIONS (3D Matrix) ────────────────────────────────────────

  type TaskStatusType =
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "WAITING_ACKNOWLEDGE"
    | "IN_PROGRESS"
    | "PENDING_REVIEW"
    | "COMPLETED"
    | "CANCELLED";

  type WorkflowModeType = "IMMEDIATE" | "NEED_APPROVAL";

  type RoleStatusActionData = {
    roleId: string;
    status: TaskStatusType;
    workflowMode: WorkflowModeType;
    action: string;
    isForceModeLocked?: boolean;
  };

  const roleStatusActions: RoleStatusActionData[] = [
    // ─ BOSS × IMMEDIATE ─────────────────────────────────────────────────────
    { roleId: bossRole.id, status: "DRAFT", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: bossRole.id, status: "DRAFT", workflowMode: "IMMEDIATE", action: "EDIT" },
    { roleId: bossRole.id, status: "PENDING_APPROVAL", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: bossRole.id, status: "PENDING_APPROVAL", workflowMode: "IMMEDIATE", action: "APPROVE" },
    { roleId: bossRole.id, status: "PENDING_APPROVAL", workflowMode: "IMMEDIATE", action: "CANCEL" },
    { roleId: bossRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: bossRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "EDIT" },
    { roleId: bossRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "CANCEL" },
    { roleId: bossRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "TOGGLE_FORCE_MODE" },
    { roleId: bossRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: bossRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "EDIT" },
    { roleId: bossRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "CANCEL" },
    { roleId: bossRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "TOGGLE_FORCE_MODE" },
    { roleId: bossRole.id, status: "PENDING_REVIEW", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: bossRole.id, status: "PENDING_REVIEW", workflowMode: "IMMEDIATE", action: "APPROVE" },
    { roleId: bossRole.id, status: "PENDING_REVIEW", workflowMode: "IMMEDIATE", action: "REJECT_REVIEW" },
    { roleId: bossRole.id, status: "COMPLETED", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: bossRole.id, status: "CANCELLED", workflowMode: "IMMEDIATE", action: "VIEW" },

    // ─ BOSS × NEED_APPROVAL ─────────────────────────────────────────────────
    { roleId: bossRole.id, status: "DRAFT", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: bossRole.id, status: "DRAFT", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: bossRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: bossRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "APPROVE" },
    { roleId: bossRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "CANCEL" },
    { roleId: bossRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: bossRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: bossRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: bossRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "CANCEL" },
    { roleId: bossRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "TOGGLE_FORCE_MODE" },
    { roleId: bossRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: bossRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: bossRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "CANCEL" },
    { roleId: bossRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "TOGGLE_FORCE_MODE" },
    { roleId: bossRole.id, status: "PENDING_REVIEW", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: bossRole.id, status: "PENDING_REVIEW", workflowMode: "NEED_APPROVAL", action: "APPROVE" },
    { roleId: bossRole.id, status: "PENDING_REVIEW", workflowMode: "NEED_APPROVAL", action: "REJECT_REVIEW" },
    { roleId: bossRole.id, status: "COMPLETED", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: bossRole.id, status: "CANCELLED", workflowMode: "NEED_APPROVAL", action: "VIEW" },

    // ─ EMPLOYEE × IMMEDIATE ─────────────────────────────────────────────────
    { roleId: employeeRole.id, status: "DRAFT", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: employeeRole.id, status: "DRAFT", workflowMode: "IMMEDIATE", action: "EDIT" },
    { roleId: employeeRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: employeeRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "ACKNOWLEDGE" },
    { roleId: employeeRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "REJECT", isForceModeLocked: true },
    { roleId: employeeRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "EDIT" },
    { roleId: employeeRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: employeeRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "COMPLETE" },
    { roleId: employeeRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "TRANSFER", isForceModeLocked: true },
    { roleId: employeeRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "REQUEST_EXTENSION" },
    { roleId: employeeRole.id, status: "PENDING_REVIEW", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: employeeRole.id, status: "COMPLETED", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: employeeRole.id, status: "CANCELLED", workflowMode: "IMMEDIATE", action: "VIEW" },

    // ─ EMPLOYEE × NEED_APPROVAL ─────────────────────────────────────────────
    { roleId: employeeRole.id, status: "DRAFT", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: employeeRole.id, status: "DRAFT", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: employeeRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: employeeRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "CANCEL" },
    { roleId: employeeRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: employeeRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: employeeRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "ACKNOWLEDGE" },
    { roleId: employeeRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "REJECT", isForceModeLocked: true },
    { roleId: employeeRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: employeeRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: employeeRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "COMPLETE" },
    { roleId: employeeRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "TRANSFER", isForceModeLocked: true },
    { roleId: employeeRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "REQUEST_EXTENSION" },
    { roleId: employeeRole.id, status: "PENDING_REVIEW", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: employeeRole.id, status: "COMPLETED", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: employeeRole.id, status: "CANCELLED", workflowMode: "NEED_APPROVAL", action: "VIEW" },

    // ─ ADMIN (BOSS + DELETE + REASSIGN + APPROVE_EXTENSION) ──────────────────
    { roleId: adminRole.id, status: "DRAFT", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: adminRole.id, status: "DRAFT", workflowMode: "IMMEDIATE", action: "EDIT" },
    { roleId: adminRole.id, status: "DRAFT", workflowMode: "IMMEDIATE", action: "DELETE" },
    { roleId: adminRole.id, status: "DRAFT", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: adminRole.id, status: "DRAFT", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: adminRole.id, status: "DRAFT", workflowMode: "NEED_APPROVAL", action: "DELETE" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "IMMEDIATE", action: "APPROVE" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "IMMEDIATE", action: "CANCEL" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "IMMEDIATE", action: "DELETE" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "APPROVE" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "CANCEL" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: adminRole.id, status: "PENDING_APPROVAL", workflowMode: "NEED_APPROVAL", action: "DELETE" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "EDIT" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "CANCEL" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "TOGGLE_FORCE_MODE" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "REASSIGN" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "IMMEDIATE", action: "DELETE" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "CANCEL" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "TOGGLE_FORCE_MODE" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "REASSIGN" },
    { roleId: adminRole.id, status: "WAITING_ACKNOWLEDGE", workflowMode: "NEED_APPROVAL", action: "DELETE" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "EDIT" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "CANCEL" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "TOGGLE_FORCE_MODE" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "REASSIGN" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "APPROVE_EXTENSION" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "IMMEDIATE", action: "DELETE" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "EDIT" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "CANCEL" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "TOGGLE_FORCE_MODE" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "REASSIGN" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "APPROVE_EXTENSION" },
    { roleId: adminRole.id, status: "IN_PROGRESS", workflowMode: "NEED_APPROVAL", action: "DELETE" },
    { roleId: adminRole.id, status: "PENDING_REVIEW", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: adminRole.id, status: "PENDING_REVIEW", workflowMode: "IMMEDIATE", action: "APPROVE" },
    { roleId: adminRole.id, status: "PENDING_REVIEW", workflowMode: "IMMEDIATE", action: "REJECT_REVIEW" },
    { roleId: adminRole.id, status: "PENDING_REVIEW", workflowMode: "IMMEDIATE", action: "DELETE" },
    { roleId: adminRole.id, status: "PENDING_REVIEW", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: adminRole.id, status: "PENDING_REVIEW", workflowMode: "NEED_APPROVAL", action: "APPROVE" },
    { roleId: adminRole.id, status: "PENDING_REVIEW", workflowMode: "NEED_APPROVAL", action: "REJECT_REVIEW" },
    { roleId: adminRole.id, status: "PENDING_REVIEW", workflowMode: "NEED_APPROVAL", action: "DELETE" },
    { roleId: adminRole.id, status: "COMPLETED", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: adminRole.id, status: "COMPLETED", workflowMode: "IMMEDIATE", action: "DELETE" },
    { roleId: adminRole.id, status: "COMPLETED", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: adminRole.id, status: "COMPLETED", workflowMode: "NEED_APPROVAL", action: "DELETE" },
    { roleId: adminRole.id, status: "CANCELLED", workflowMode: "IMMEDIATE", action: "VIEW" },
    { roleId: adminRole.id, status: "CANCELLED", workflowMode: "IMMEDIATE", action: "DELETE" },
    { roleId: adminRole.id, status: "CANCELLED", workflowMode: "NEED_APPROVAL", action: "VIEW" },
    { roleId: adminRole.id, status: "CANCELLED", workflowMode: "NEED_APPROVAL", action: "DELETE" },
  ];

  for (const rsa of roleStatusActions) {
    await prisma.roleStatusAction.upsert({
      where: {
        roleId_status_workflowMode_action: {
          roleId: rsa.roleId,
          status: rsa.status,
          workflowMode: rsa.workflowMode,
          action: rsa.action,
        },
      },
      update: {},
      create: {
        roleId: rsa.roleId,
        status: rsa.status,
        workflowMode: rsa.workflowMode,
        action: rsa.action,
        isForceModeLocked: rsa.isForceModeLocked ?? false,
      },
    });
  }

  console.log("✅ Role status actions (3D matrix) created");

  // ─── REPORT TEMPLATES ───────────────────────────────────────────────────────

  const reportTemplates = [
    {
      title: "Đã xử lý xong",
      content: "Đã kiểm tra và xử lý xong vấn đề. Kết quả: [mô tả kết quả]. Không phát sinh vấn đề thêm.",
      category: "Kết quả",
    },
    {
      title: "Đã gửi phản hồi cho người dùng",
      content: "Đã liên hệ và phản hồi cho người dùng về vấn đề này. Người dùng đã xác nhận và đồng ý với hướng giải quyết.",
      category: "Kết quả",
    },
    {
      title: "Đã cài đặt / cập nhật",
      content: "Đã tiến hành cài đặt / cập nhật [tên phần mềm / thiết bị]. Phiên bản: [phiên bản]. Hệ thống hoạt động bình thường sau khi cập nhật.",
      category: "Kỹ thuật",
    },
    {
      title: "Cần theo dõi thêm",
      content: "Đã xử lý bước đầu nhưng vấn đề cần theo dõi thêm trong [X ngày]. Sẽ cập nhật tình trạng sau khi có kết quả rõ ràng.",
      category: "Theo dõi",
    },
    {
      title: "Chuyển giao cho bộ phận khác",
      content: "Đã xem xét và nhận thấy vấn đề thuộc phạm vi của [bộ phận khác]. Đã chuyển giao và thông báo cho người liên quan.",
      category: "Chuyển giao",
    },
  ];

  // Lấy adminId để set createdBy
  const adminUser = await prisma.user.findUnique({ where: { username: "admin" }, select: { id: true } });
  if (adminUser) {
    for (const tpl of reportTemplates) {
      const existing = await prisma.reportTemplate.findFirst({ where: { title: tpl.title } });
      if (!existing) {
        await prisma.reportTemplate.create({ data: { ...tpl, createdBy: adminUser.id } });
      }
    }
  }

  console.log("✅ Report templates created");

  console.log("\n🎉 Seed completed successfully!");
  console.log("📊 Summary:");
  console.log("  - 3 Roles: ADMIN, BOSS, EMPLOYEE");
  console.log("  - 1 User: admin (password từ ADMIN_INITIAL_PASSWORD, mustChangePassword=true)");
  console.log("  - 4 Priorities: Khẩn cấp, Cao, Bình thường, Thấp");
  console.log("  - 5 Task Types: Phần mềm, Phần cứng, Mạng, Phát triển, Khác");
  console.log("  - 5 Report Templates mẫu");
  console.log("  - Full permission set + 3D RBAC matrix");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
