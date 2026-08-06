import { Alert } from 'react-native';

// Simulated notification system
export const showNotification = (message: string) => {
  Alert.alert('🔔 Notification', message);
};

// Prediction: check bins >80% and notify
export const checkAndNotifyOverflow = async (
  getBins: any,
  getTasks: any,
  addTask: any,
  autoAssignTask: any
) => {
  const bins = await getBins();
  const tasks = await getTasks();
  for (const bin of bins) {
    if (bin.level >= 90) {
      const existing = tasks.find((t: any) => t.binId === bin.id && t.status !== 'completed');
      if (!existing) {
        showNotification(`🔴 CRITICAL: Bin ${bin.id} is at ${bin.level}%!`);
        // Auto-assign if no task
        await autoAssignTask(bin.id, 'critical');
      }
    } else if (bin.level >= 80 && bin.level < 90) {
      const existing = tasks.find((t: any) => t.binId === bin.id && t.status !== 'completed');
      if (!existing) {
        showNotification(`⚠️ Warning: Bin ${bin.id} is at ${bin.level}%`);
        await autoAssignTask(bin.id, 'high');
      }
    } else if (bin.level >= 70 && bin.level < 80) {
      // prediction: will overflow in 2 hours (simulated)
      showNotification(`📈 Prediction: Bin ${bin.id} may overflow in 2 hours.`);
    }
  }
};