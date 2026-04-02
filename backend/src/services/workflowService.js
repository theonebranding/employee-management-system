import Workflow from '../models/workflowSchema.js';
import WorkflowStep from '../models/workflowStepSchema.js';
import WorkflowInstance from '../models/workflowInstanceSchema.js';
import WorkflowSlaEvent from '../models/workflowSlaEventSchema.js';
import Delegation from '../models/delegationSchema.js';
import { ROLE_TEMPLATES } from '../constants/roleTemplates.js';

const LEAVE_WORKFLOW_KEY = 'leave-approval-v1';

const toDueDate = (hours = 24) => new Date(Date.now() + Number(hours || 24) * 60 * 60 * 1000);

export const ensureDefaultWorkflows = async () => {
  const leaveWorkflow = await Workflow.findOneAndUpdate(
    { key: LEAVE_WORKFLOW_KEY },
    {
      $set: {
        key: LEAVE_WORKFLOW_KEY,
        name: 'Leave Approval',
        module: 'leave-policy',
        description: 'Manager to HR leave approval chain',
        isActive: true,
        version: 1,
        steps: [
          {
            name: 'Manager Approval',
            sequence: 1,
            approverType: 'manager',
            slaHours: 24,
            escalationRoleTemplate: ROLE_TEMPLATES.HR_ADMIN,
          },
          {
            name: 'HR Approval',
            sequence: 2,
            approverType: 'roleTemplate',
            roleTemplate: ROLE_TEMPLATES.HR_ADMIN,
            slaHours: 24,
            escalationRoleTemplate: ROLE_TEMPLATES.SUPER_ADMIN,
          },
        ],
      },
    },
    { upsert: true, new: true }
  );

  const stepOps = leaveWorkflow.steps.map((step) => ({
    updateOne: {
      filter: { workflowId: leaveWorkflow._id, sequence: step.sequence },
      update: {
        $set: {
          workflowId: leaveWorkflow._id,
          name: step.name,
          sequence: step.sequence,
          approverType: step.approverType,
          roleTemplate: step.roleTemplate || null,
          approverUser: step.approverUser || null,
          slaHours: step.slaHours,
          escalationRoleTemplate: step.escalationRoleTemplate || null,
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  if (stepOps.length > 0) {
    await WorkflowStep.bulkWrite(stepOps);
  }
};

const resolveDelegatedUser = async (userId) => {
  if (!userId) return null;

  const now = new Date();
  const delegation = await Delegation.findOne({
    fromUser: userId,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean();

  return delegation?.toUser || null;
};

const buildInstanceSteps = async (workflow, managerId = null) => {
  const steps = [];

  for (const step of workflow.steps.sort((a, b) => a.sequence - b.sequence)) {
    const dueAt = toDueDate(step.slaHours);
    let assignedTo = null;

    if (step.approverType === 'manager' && managerId) {
      assignedTo = (await resolveDelegatedUser(managerId)) || managerId;
    }

    steps.push({
      name: step.name,
      sequence: step.sequence,
      approverType: step.approverType,
      roleTemplate: step.roleTemplate || null,
      assignedTo,
      status: 'pending',
      dueAt,
    });
  }

  return steps;
};

export const createLeaveWorkflowInstance = async ({ leaveId, requesterId, managerId, metadata = {} }) => {
  const workflow = await Workflow.findOne({ key: LEAVE_WORKFLOW_KEY, isActive: true });
  if (!workflow) {
    return null;
  }

  const steps = await buildInstanceSteps(workflow, managerId);

  return WorkflowInstance.findOneAndUpdate(
    {
      entityType: 'leave',
      entityId: leaveId,
    },
    {
      $setOnInsert: {
        workflowId: workflow._id,
        workflowKey: workflow.key,
        entityType: 'leave',
        entityId: leaveId,
        requester: requesterId,
        status: 'pending',
        currentStepIndex: 0,
        steps,
        startedAt: new Date(),
        metadata,
      },
    },
    { upsert: true, new: true }
  );
};

export const recordWorkflowSlaBreach = async (workflowInstance) => {
  const currentStep = workflowInstance?.steps?.[workflowInstance.currentStepIndex];
  if (!currentStep?.dueAt) return;
  if (new Date(currentStep.dueAt).getTime() > Date.now()) return;

  await WorkflowSlaEvent.create({
    workflowInstanceId: workflowInstance._id,
    stepSequence: currentStep.sequence,
    eventType: 'deadline_reached',
    dueAt: currentStep.dueAt,
    assigneeId: currentStep.assignedTo || null,
    escalatedToRoleTemplate: currentStep.roleTemplate || null,
  });
};

export const transitionLeaveWorkflow = async ({ leaveId, actorId, decision, note = '' }) => {
  const instance = await WorkflowInstance.findOne({ entityType: 'leave', entityId: leaveId });
  if (!instance) {
    return { workflow: null, completed: true, status: decision === 'rejected' ? 'rejected' : 'approved' };
  }

  await recordWorkflowSlaBreach(instance);

  const currentIndex = instance.currentStepIndex;
  const currentStep = instance.steps[currentIndex];

  if (!currentStep || instance.status !== 'pending') {
    return { workflow: instance, completed: true, status: instance.status };
  }

  currentStep.status = decision === 'approved' ? 'approved' : 'rejected';
  currentStep.actedBy = actorId;
  currentStep.actedAt = new Date();
  currentStep.decisionNote = note;

  if (decision === 'rejected') {
    instance.status = 'rejected';
    instance.completedAt = new Date();
  } else if (currentIndex === instance.steps.length - 1) {
    instance.status = 'approved';
    instance.completedAt = new Date();
  } else {
    instance.currentStepIndex += 1;
  }

  await instance.save();

  return {
    workflow: instance,
    completed: instance.status !== 'pending',
    status: instance.status,
  };
};
