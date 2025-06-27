import { Button, DatePicker, Grid, GridActiveItemChangedEvent, GridColumn, TextField } from '@vaadin/react-components';
import { Group, ViewToolbar } from 'Frontend/components/ViewToolbar';

import { Notification } from '@vaadin/react-components/Notification';
import Task from 'Frontend/generated/com/example/app/taskmanagement/domain/Task';
import { TaskService } from 'Frontend/generated/endpoints';
import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import handleError from 'Frontend/views/_ErrorHandler';
import { useDataProvider } from '@vaadin/hilla-react-crud';
import { useSignal } from '@vaadin/hilla-react-signals';

export const config: ViewConfig = {
  title: 'Task List',
  menu: {
    icon: 'vaadin:clipboard-check',
    order: 1,
    title: 'Task List',
  },
  loginRequired: false,
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

type TaskEntryFormProps = {
  onTaskCreated?: () => void;
};

function TaskEntryForm(props: TaskEntryFormProps) {
  const description = useSignal('');
  const dueDate = useSignal<string | undefined>('');
  const createTask = async () => {
    try {
      await TaskService.createTask(description.value, dueDate.value);
      if (props.onTaskCreated) {
        props.onTaskCreated();
      }
      description.value = '';
      dueDate.value = undefined;
      Notification.show('Task added', { duration: 3000, position: 'bottom-end', theme: 'success' });
    } catch (error) {
      handleError(error);
    }
  };
  return (
    <>
      <TextField
        placeholder="What do you want to do?"
        aria-label="Task description"
        maxlength={255}
        style={{ minWidth: '20em' }}
        value={description.value}
        onValueChanged={(evt) => (description.value = evt.detail.value)}
      />
      <DatePicker
        placeholder="Due date"
        aria-label="Due date"
        value={dueDate.value}
        onValueChanged={(evt) => (dueDate.value = evt.detail.value)}
      />
      <Button onClick={createTask} theme="primary">
        Create
      </Button>
    </>
  );
}

export default function TaskListView() {
  const dataProvider = useDataProvider<Task>({
    list: (pageable) => TaskService.list(pageable),
  });
  const selectedItem = useSignal<Task | null>(null);

  const onSelectItem = (e: GridActiveItemChangedEvent<any>) => {
		const item = e.detail.value;
		selectedItem.value = item ?? null;
	}

  return (
    <main className="w-full h-full flex flex-col box-border gap-s p-m">
      <ViewToolbar title="Task List">
        <Group>
          <TaskEntryForm onTaskCreated={dataProvider.refresh} />
        </Group>
      </ViewToolbar>
      <Grid 
      pageSize={10}
      dataProvider={dataProvider.dataProvider}
      selectedItems={selectedItem.value == null ? [] : [selectedItem.value]}
			onActiveItemChanged={onSelectItem}
      itemIdPath="id"
      >
        <GridColumn path="description" />
        <GridColumn path="dueDate" header="Due Date">
          {({ item }) => (item.dueDate ? dateFormatter.format(new Date(item.dueDate)) : 'Never')}
        </GridColumn>
        <GridColumn path="creationDate" header="Creation Date">
          {({ item }) => dateTimeFormatter.format(new Date(item.creationDate))}
        </GridColumn>
      </Grid>
    </main>
  );
}
