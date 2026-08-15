// Performance monitoring utilities for waitlist promotion
export class PerformanceMonitor {
  private static metrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  static startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.recordMetric(operation, duration);
    };
  }

  private static recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.metrics.set(operation, existing);
    
    // Log performance metrics
    if (operation === 'waitlist-promotion') {
      console.log(`📊 Waitlist promotion performance: ${duration}ms (avg: ${existing.avgTime.toFixed(2)}ms, count: ${existing.count})`);
    }
  }

  static getMetrics(): Map<string, { count: number; totalTime: number; avgTime: number }> {
    return this.metrics;
  }

  static getWaitlistPromotionStats(): { avgTime: number; count: number; totalTime: number } {
    const stats = this.metrics.get('waitlist-promotion');
    return stats || { avgTime: 0, count: 0, totalTime: 0 };
  }

  static resetMetrics(): void {
    this.metrics.clear();
  }
}
