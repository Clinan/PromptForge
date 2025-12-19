<script setup lang="ts">
import { Button, Card, Col, Row, Space, Tag } from 'ant-design-vue';

const props = defineProps<{
  projectOptions: { id: string; label: string }[];
  selectedProjectId: string;
}>();

const emit = defineEmits<{
  select: [projectId: string];
}>();
</script>

<template>
  <Card size="small" title="Projects">
    <Space direction="vertical" style="width: 100%">
      <Button
        v-for="project in props.projectOptions"
        :key="project.id"
        block
        :type="props.selectedProjectId === project.id ? 'primary' : 'default'"
        @click="emit('select', project.id)"
      >
        <Row align="middle" justify="space-between" style="width: 100%">
          <Col flex="auto">{{ project.label }}</Col>
          <Col flex="0 0 auto">
            <Tag color="green">Live</Tag>
          </Col>
        </Row>
      </Button>
    </Space>
  </Card>
</template>
