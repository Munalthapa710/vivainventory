export const DEFAULT_STORAGE_LOCATION = "Main Warehouse";

export const EMPLOYEE_MOVEMENT_OPTIONS = [
  {
    value: "used",
    label: "Used on site"
  },
  {
    value: "returned",
    label: "Returned to warehouse"
  },
  {
    value: "damaged",
    label: "Damaged or lost"
  }
];

export const MOVEMENT_REASON_OPTIONS = {
  used: [
    {
      value: "project_use",
      label: "Project use"
    },
    {
      value: "routine_maintenance",
      label: "Routine maintenance"
    },
    {
      value: "installation",
      label: "Installation"
    },
    {
      value: "testing",
      label: "Testing"
    }
  ],
  returned: [
    {
      value: "unused_surplus",
      label: "Unused surplus"
    },
    {
      value: "task_completed",
      label: "Task completed"
    },
    {
      value: "wrong_item",
      label: "Wrong item issued"
    }
  ],
  damaged: [
    {
      value: "damaged_on_site",
      label: "Damaged on site"
    },
    {
      value: "lost_in_field",
      label: "Lost in field"
    },
    {
      value: "expired",
      label: "Expired or unusable"
    }
  ]
};

export const SYSTEM_REASON_CODES = {
  warehouseAllocation: "warehouse_allocation",
  allocationIncrease: "allocation_increase",
  allocationReduction: "allocation_reduction",
  returnedToWarehouse: "returned_to_warehouse",
  adminRemoval: "admin_assignment_removed"
};

export const REASON_LABELS = {
  project_use: "Project use",
  routine_maintenance: "Routine maintenance",
  installation: "Installation",
  testing: "Testing",
  unused_surplus: "Unused surplus",
  task_completed: "Task completed",
  wrong_item: "Wrong item issued",
  damaged_on_site: "Damaged on site",
  lost_in_field: "Lost in field",
  expired: "Expired or unusable",
  warehouse_allocation: "Warehouse allocation",
  allocation_increase: "Allocation increase",
  allocation_adjustment: "Allocation adjustment",
  allocation_reduction: "Allocation reduction",
  returned_to_warehouse: "Returned to warehouse",
  admin_assignment_removed: "Assignment removed",
  general: "General"
};

export function getMovementReasonOptions(actionType) {
  return MOVEMENT_REASON_OPTIONS[actionType] || [];
}

export function getDefaultMovementReason(actionType) {
  return getMovementReasonOptions(actionType)[0]?.value || "general";
}

export function isValidMovementAction(actionType) {
  return EMPLOYEE_MOVEMENT_OPTIONS.some((option) => option.value === actionType);
}

export function isValidMovementReason(actionType, reasonCode) {
  return getMovementReasonOptions(actionType).some(
    (option) => option.value === reasonCode
  );
}
