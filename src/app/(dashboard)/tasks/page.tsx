import { AddTaskForm } from "@/components/dashboard/add-task-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { TaskBoard } from "@/components/dashboard/task-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Tasks" description="What needs to get done." />

      {profile.role === "owner" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New task</CardTitle>
          </CardHeader>
          <CardContent>
            <AddTaskForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskBoard tasks={tasks ?? []} role={profile.role} />
        </CardContent>
      </Card>
    </div>
  );
}
