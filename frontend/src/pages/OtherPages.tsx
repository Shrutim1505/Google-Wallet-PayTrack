import { Card, EmptyState } from '@/shared/ui';
import { Wallet, Users, RefreshCw } from 'lucide-react';

export function WalletPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Google Wallet</h1>
        <p className="text-gray-600 mt-1">Sync receipts to Google Wallet</p>
      </header>
      <Card>
        <EmptyState
          icon={<Wallet className="w-6 h-6" />}
          title="Wallet integration"
          description="Sync your receipts as Google Wallet passes"
        />
      </Card>
    </div>
  );
}

export function SplitsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Splits</h1>
        <p className="text-gray-600 mt-1">Share expenses with friends</p>
      </header>
      <Card>
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Split expenses"
          description="Create a split from any receipt to share with friends"
        />
      </Card>
    </div>
  );
}

export function RecurringPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Recurring</h1>
        <p className="text-gray-600 mt-1">Patterns detected from your spending</p>
      </header>
      <Card>
        <EmptyState
          icon={<RefreshCw className="w-6 h-6" />}
          title="Recurring expenses"
          description="We'll detect recurring subscriptions as you add more receipts"
        />
      </Card>
    </div>
  );
}
