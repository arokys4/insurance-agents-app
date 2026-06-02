async function addAuditLog(db, data) {
  const {
    userId = null,
    userRole = null,
    action,
    entityType,
    entityId = null,
    description
  } = data;

  if (!action || !entityType || !description) {
    return;
  }

  await db.run(
    `
    INSERT INTO audit_logs (
      user_id,
      user_role,
      action,
      entity_type,
      entity_id,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      userRole,
      action,
      entityType,
      entityId,
      description
    ]
  );
}

module.exports = {
  addAuditLog
};