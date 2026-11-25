"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useKaggleAutomation } from "./kaggle/useKaggleAutomation";
import { KaggleSyncPanel } from "./kaggle/KaggleSyncPanel";
import { KaggleAutomationPanel } from "./kaggle/KaggleAutomationPanel";
import { KaggleLogsPanel } from "./kaggle/KaggleLogsPanel";
import { KaggleTrainingPipelineSection } from "./kaggle/KaggleTrainingPipelineSection";

interface TabEksperimenKaggleProps {
  researchSummary: any;
  onRefresh: () => void;
}

export function TabEksperimenKaggle({ researchSummary, onRefresh }: TabEksperimenKaggleProps) {
  const vm = useKaggleAutomation({ onRefresh });
  const syncStatus = vm.datasetSyncState?.status || "idle";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KaggleSyncPanel
          syncStatus={syncStatus}
          kaggleDatasetUrl={vm.kaggleInfo?.dataset_url}
          deltaMetrics={vm.deltaMetrics}
          syncForm={vm.syncForm}
          schedulerStatus={vm.schedulerStatus}
          isTriggeringSync={vm.isTriggeringSync}
          isSavingSync={vm.isSavingSync}
          onChangeSyncForm={vm.setSyncForm}
          onRunSyncNow={vm.handleRunSyncNow}
          onResetSync={vm.handleResetDatasetSync}
          onSaveSyncConfig={vm.handleSaveSyncConfig}
        />

        <KaggleAutomationPanel
          trainForm={vm.trainForm}
          trainStatus={vm.trackStates[vm.trainForm.target_track || "v1"].status}
          deltaMetrics={vm.deltaMetrics}
          schedulerStatus={vm.schedulerStatus}
          isTriggeringAutoTrain={vm.isTriggeringAutoTrain}
          isSavingTrain={vm.isSavingTrain}
          onChangeTrainForm={vm.setTrainForm}
          onRunTrainDeltaCheck={vm.handleRunTrainDeltaCheck}
          onSaveTrainConfig={vm.handleSaveTrainConfig}
        />
      </div>

      <KaggleLogsPanel
        autoLogs={vm.autoLogs}
        isLoadingAuto={vm.isLoadingAuto}
        onRefresh={vm.loadAutomationState}
        onClearLogs={vm.handleClearAutoLogs}
      />

      <KaggleTrainingPipelineSection
        selectedTrack={vm.selectedTrack}
        onSelectTrack={vm.setSelectedTrack}
        trackStatuses={{
          v1: vm.trackStates.v1.status,
          v2: vm.trackStates.v2.status,
        }}
        otherTrackRunning={vm.otherTrackRunning}
        kaggleInfo={vm.kaggleInfo}
        kaggleUrl={vm.kaggleUrl}
        trainStatus={vm.trainStatus}
        elapsed={vm.elapsed}
        trainResult={vm.trainResult}
        trainError={vm.trainError}
        isFetchingOutput={vm.isFetchingOutput}
        researchSummary={researchSummary}
        onResetTraining={() => vm.handleResetTraining(vm.selectedTrack)}
        onCheckStatus={() => vm.checkStatus(vm.selectedTrack)}
        onFetchLatestOutput={() => vm.handleFetchLatestOutput(vm.selectedTrack)}
        onTriggerTrain={() => vm.handleTriggerTrain(vm.selectedTrack)}
      />

      <ConfirmModal
        open={Boolean(vm.confirmDialog)}
        onClose={() => vm.setConfirmDialog(null)}
        onConfirm={async () => {
          if (!vm.confirmDialog) return;
          vm.setConfirmLoading(true);
          try {
            await vm.confirmDialog.action();
            vm.setConfirmDialog(null);
          } finally {
            vm.setConfirmLoading(false);
          }
        }}
        loading={vm.confirmLoading}
        title={vm.confirmDialog?.title || "Konfirmasi"}
        message={vm.confirmDialog?.message}
        confirmText={vm.confirmDialog?.confirmText || "Konfirmasi"}
        variant={vm.confirmDialog?.variant || "primary"}
      />
    </div>
  );
}
