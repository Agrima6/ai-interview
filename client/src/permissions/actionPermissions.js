export const actionPermissions = {
    approveClient: "CLIENT_APPROVE",
    rejectClient: "CLIENT_REJECT",
    requestClientChanges: "CLIENT_REQUEST_CHANGES",
    updateClientStatus: "CLIENT_UPDATE",
    // Full client-detail edit reuses the same CLIENT_UPDATE permission the
    // suspend/reactivate status transitions already require - there's no
    // separate "edit basic fields" vs "change status" distinction on the
    // backend (both routes are gated on CLIENT_UPDATE), so introducing a
    // new permission constant here would just create two names for one
    // check.
    editClient: "CLIENT_UPDATE",
    approveOnboarding: "ONBOARDING_APPROVE",
    rejectOnboarding: "ONBOARDING_REJECT",
    publishForm: "FORM_PUBLISH",
    editForm: "FORM_WRITE",
    retryCommunication: "COMMUNICATION_RETRY",
}
