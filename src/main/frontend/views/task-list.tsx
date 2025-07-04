import { Button, DatePicker, FormLayout, Grid, GridActiveItemChangedEvent, GridColumn, GridElement, GridSortColumn, Icon, SplitLayout, Tab, Tabs, TextField, Tooltip, VerticalLayout } from '@vaadin/react-components';
import { Group, ViewToolbar } from 'Frontend/components/ViewToolbar';
import { createContext, useEffect, useRef } from "react";
import { useDataProvider, useGridDataProvider } from '@vaadin/hilla-react-crud';

import Direction from "Frontend/generated/org/springframework/data/domain/Sort/Direction";
import { Notification } from '@vaadin/react-components/Notification';
import NullHandling from "Frontend/generated/org/springframework/data/domain/Sort/NullHandling";
import Task from 'Frontend/generated/com/example/app/taskmanagement/domain/Task';
import { TaskService } from 'Frontend/generated/endpoints';
import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import handleError from 'Frontend/views/_ErrorHandler';
import { useSignal } from '@vaadin/hilla-react-signals';

export function generateRandomString(minLength: number = 10, maxLength: number = 50): string {
  // Validate input
  if (minLength < 1 || maxLength < minLength) {
    throw new Error('Invalid length parameters');
  }

  // Determine the length of the random string
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

  // Characters to use in the random string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export const tableFormLayout = "border border-contrast-50 rounded-l box-border gap-s mb-s p-s";

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

type FakeComponentProps = {
  task?: Task;
};

function TaskEntryForm(props: Readonly<TaskEntryFormProps>) {
  const description = useSignal('');
  const dueDate = useSignal<string | undefined>('');
  const createTask = async () => {
    try {
      await TaskService.createTask(generateRandomString(30, 50), dueDate.value);
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

  const load = async () => {
    const res = await TaskService.list({ pageNumber: 1, pageSize: 10, sort: { orders: [] } })
    if (res?.length == 0) {
      for (let i = 0; i < 220; i++) {
        await TaskService.createTask(generateRandomString(30, 50), dueDate.value);
      }
    }
  }

  useEffect(() => { load() }, [])
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
      {/* <DatePicker
        placeholder="Due date"
        aria-label="Due date"
        value={dueDate.value}
        onValueChanged={(evt) => (dueDate.value = evt.detail.value)}
      /> */}
      <Button onClick={createTask} theme="primary">
        Create
      </Button>
    </>
  );
}

function FakeComponent(props: Readonly<FakeComponentProps>) {

  useEffect(() => {
    const load = async () => {
      const res = await TaskService.list({ pageNumber: 1, pageSize: 10, sort: { orders: [] } })
    }
  }, [props.task]
  );

  if (!props.task) {
    return <div className={`w-full h-full text-center content-center`} style={{ height: "40%"  }}>
      <span className="text-l w-full h-full">No gate selected</span>
    </div>
  }

  return (
    <VerticalLayout
      style={{ height: "40%" }}
      className={`w-full h-full`}
      theme="small"
    >
      <Tabs>
        <Tab >Statistics</Tab>
        <Tab>General</Tab>
        <Tab>Extra</Tab>
        <Tab>Features</Tab>
        <div className="toolbar flex gap-s w-full">
          <Button theme='secondary small' onClick={() => { }}>
            <Icon icon="vaadin:refresh" />
            <Tooltip slot="tooltip" text="Update" />
          </Button>
          <Button theme='secondary error small' onClick={() => { }}>
            <Icon icon="vaadin:trash" />
            <Tooltip slot="tooltip" text="Reset online statistics" />
          </Button>
        </div>
      </Tabs>
      <FormLayout className="mt-s mb-s w-full" responsiveSteps={[{ columns: 4 }]}>
        <span>
          {props.task?.description ?? ""}
        </span>
      </FormLayout>
    </VerticalLayout>
  );
}

export const ParametersContext = createContext<String | null>(null);

export default function TaskListView() {
  const ref = useRef<GridElement>(null);
  const filterText = useSignal('');
  const count = useSignal<number | undefined>(0);

  const dataProvider = useGridDataProvider(
    async (pageable) => {
      if (pageable.sort.orders.length == 0) {
        pageable.sort.orders.push({ property: "id", direction: Direction.ASC, ignoreCase: true, nullHandling: NullHandling.NATIVE })
      }
      const response = await TaskService.list(pageable);
      response?.forEach((task) => { if (task.id) { task.id += 1500 } });
      if (!response) {
        return []
      }
      count.value = response.length;
      // after updating the row we need to have it in form if gate isn't changed
      return response as Task[];
    },
    [filterText.value]
  );

  const selectedItem = useSignal<Task | null>(null);

  const onSelectItem = (e: GridActiveItemChangedEvent<any>) => {
    const item = e.detail.value;
    selectedItem.value = item ?? null;
  }


  return (
    <ParametersContext.Provider value={count.value!.toFixed(2)}>
      <SplitLayout className="w-full h-full" orientation="vertical">
        <VerticalLayout style={{ height: '60%' }}>
          <ViewToolbar title="Task List">
            <Group>
              <TaskEntryForm onTaskCreated={dataProvider.refresh} />
            </Group>
          </ViewToolbar>
          <Grid
            theme="compact row-stripes"
            className={`${tableFormLayout} m-s`}
            ref={ref}
            pageSize={100}
            dataProvider={dataProvider}
            selectedItems={selectedItem.value == null ? [] : [selectedItem.value]}
            onActiveItemChanged={onSelectItem}
            itemIdPath="id"
          >
            <GridSortColumn path="id" autoWidth frozen flexGrow={0} />
            <GridSortColumn path="description" autoWidth resizable />
            <GridColumn path="dueDate" header="Due Date" autoWidth resizable>
              {({ item }) => (item.dueDate ? dateFormatter.format(new Date(item.dueDate)) : 'Never')}
            </GridColumn>
            <GridColumn path="creationDate" header="Creation Date" autoWidth resizable>
              {({ item }) => dateTimeFormatter.format(new Date(item.creationDate))}
            </GridColumn>
          </Grid>
        </VerticalLayout>
        <FakeComponent task={selectedItem.value as Task} />
      </SplitLayout>
    </ParametersContext.Provider>
  );
}
