<template>
  <div class="index">
    <div class="index-left" ref="indexLeftRef">
      <div class="left-area-box"></div>

      <div class="left-resize-bar">⋮</div>

      <div class="left-view-more" @click="handleViewMoreLeftClick">
        <div class="left-view-more-content">
          <div class="left-view-more-false" v-if="!isCollapseLeft" />
          <div class="left-view-more-true" v-else />
        </div>
      </div>
    </div>

    <div class="index-middle" ref="indexRightRef">
      <div class="middle-area-box">
        <div class="middle-area-box_main">
          <div class="middle-area-box_main_up">
            <div class="middle-area-box_main_up_wrapper">
              <!-- ^ 工具栏 -->
              <div class="index-tools-container">
                <el-form :inline="true" style="display: flex">
                  <div class="tools-left"></div>

                  <div class="tools-right">
                    <el-form-item style="margin: 0 0 7px 7px">
                      <el-button size="small" type="primary">
                        <el-icon :size="12" style="margin-right: 5px"><ElementPlus /></el-icon>
                        <small>ElementPlus</small>
                      </el-button>
                    </el-form-item>
                  </div>
                </el-form>
              </div>
              <!-- / 工具栏 -->

              <!-- ^ 内容区 -->
              <div class="index-table-container">
                <el-table
                  border
                  size="small"
                  row-key="id"
                  ref="tableRef"
                  height="100%"
                  highlight-current-row
                  :data="tableList"
                >

                  <el-table-column fixed type="selection" :resizable="false" width="30" reserve-selection align="center" />
                  <el-table-column prop="name" label="英雄名称" align="center" width="200" show-overflow-tooltip />
                  <el-table-column prop="description" label="英雄描述" align="center" width="auto" show-overflow-tooltip />
                  <el-table-column prop="firstSkill" label="一技能" align="center" width="200" show-overflow-tooltip />
                  <el-table-column prop="secondSkill" label="二技能" align="center" width="200" show-overflow-tooltip />
                  <el-table-column prop="thirdSkill" label="三技能" align="center" width="200" show-overflow-tooltip />

                  <template #empty v-if="tableList == undefined || tableList.length == 0">Nothing ~</template>
                </el-table>
              </div>
              <!-- / 内容区 -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="index-right" ref="indexRightRef">
      <div class="right-view-more" @click="handleViewMoreRightClick">
        <div class="right-view-more-content">
          <div class="right-view-more-false" v-if="!isCollapseRight" />
          <div class="right-view-more-true" v-else />
        </div>
      </div>

      <div class="right-resize-bar">⋮</div>

      <div class="right-area-box"></div>
    </div>
  </div>
</template>

<script setup>
import {
    
     h, onMounted, onUnmounted, ref, getCurrentInstance, reactive, watch, nextTick } from 'vue'

// 代理对象
const {
    
     proxy } = getCurrentInstance()

// 是否收起左侧
const isCollapseLeft = ref(false)
// 左侧模块箭头点击事件句柄方法
const handleViewMoreLeftClick = async () => {
    
    
  const indexLeftRef = await proxy.$refs.indexLeftRef
  isCollapseLeft.value = !isCollapseLeft.value
  if (isCollapseLeft.value) {
    
    
    indexLeftRef.style.width = '23px'
  } else {
    
    
    indexLeftRef.style.width = '400px'
  }
}

// 表格实例
const tableRef = ref(null)

// 表格数据
const tableList = ref([])

// 是否收起右侧
const isCollapseRight = ref(false)
// 右侧模块箭头点击事件句柄方法
const handleViewMoreRightClick = async () => {
    
    
  const indexRightRef = await proxy.$refs.indexRightRef
  isCollapseRight.value = !isCollapseRight.value
  if (isCollapseRight.value) {
    
    
    indexRightRef.style.width = '23px'
  } else {
    
    
    indexRightRef.style.width = '400px'
  }
}

/**
 * 左侧拖动改变宽度事件句柄方法
 */
const handleDragLeftResizeBar = () => {
    
    
  var leftResizeBar = document.getElementsByClassName("left-resize-bar")[0]
  var wholeArea = document.getElementsByClassName("index")[0]
  var leftArea = document.getElementsByClassName("index-left")[0]
  var middleArea = document.getElementsByClassName("index-middle")[0]
  var rightArea = document.getElementsByClassName("index-right")[0]
  console.log('leftResizeBar =>', leftResizeBar)
  console.log('wholeArea =>', wholeArea)
  console.log('leftArea =>', leftArea)
  console.log('middleArea =>', middleArea)
  console.log('rightArea =>', rightArea)

  // 鼠标按下事件
  leftResizeBar.onmousedown = function (eventDown) {
    
    
    // 颜色提醒
    leftResizeBar.style.backgroundColor = "#5e7ce0"
    leftResizeBar.style.color = "#ffffff"

    // 鼠标拖动事件
    document.onmousemove = function (eventMove) {
    
    

      let width = eventMove.clientX + 20
      console.log('width =>', width)
      if (width >= 800) {
    
    
        width = 800 // 设置最大拉伸宽度为800
      } else if (width <= 23) {
    
    
        // 当拉伸宽度为小于或等于23，最小拉伸宽度为23，同时是否收起图标向右
        width = 23
        isCollapseLeft.value = true
      } else {
    
    
        // 当拉伸宽度为大于23且小于600，是否收起图标向左
        isCollapseLeft.value = false
      }
      leftArea.style.width = width + 'px'
    }

    // 鼠标松开事件
    document.onmouseup = function (evt) {
    
    
      // 颜色恢复
      leftResizeBar.style.backgroundColor = "#ffffff"
      leftResizeBar.style.color = "#40485c"

      document.onmousemove = null
      document.onmouseup = null
      leftResizeBar.releaseCapture && leftResizeBar.releaseCapture();
    }

    leftResizeBar.setCapture && leftResizeBar.setCapture();
    return false
  }
}

/**
 * 右侧拖动改变宽度事件句柄方法
 */
const handleDragRightResizeBar = () => {
    
    
  var rightResizeBar = document.getElementsByClassName("right-resize-bar")[0]
  var wholeArea = document.getElementsByClassName("index")[0]
  var leftArea = document.getElementsByClassName("index-left")[0]
  var middleArea = document.getElementsByClassName("index-middle")[0]
  var rightArea = document.getElementsByClassName("index-right")[0]
  console.log('rightResizeBar =>', rightResizeBar)
  console.log('wholeArea =>', wholeArea)
  console.log('leftArea =>', leftArea)
  console.log('middleArea =>', middleArea)
  console.log('rightArea =>', rightArea)

  // 鼠标按下事件
  rightResizeBar.onmousedown = function (eventDown) {
    
    
    // 颜色提醒
    rightResizeBar.style.backgroundColor = "#5e7ce0"
    rightResizeBar.style.color = "#ffffff"

    // 开始x坐标
    // let startX = eventDown.clientX
    // console.log('startX =>', startX)

    // 鼠标拖动事件
    document.onmousemove = function (eventMove) {
    
    
      // 方式一：基于移动距离方式实现
      // const endX = eventMove.clientX // 结束坐标
      // const len = startX - endX // 移动距离
      // rightArea.style.width = rightArea.clientWidth + len + 'px' // 改变宽度
      // startX = endX // 重新对开始x坐标赋值

      // 方式二：基于总长度和结束x坐标方式实现
      let width = wholeArea.clientWidth + 20 - eventMove.clientX
      if (width >= 800) {
    
    
        width = 800 // 设置最大拉伸宽度为800
      } else if (width <= 23) {
    
    
        // 当拉伸宽度为小于或等于23，最小拉伸宽度为23，同时是否收起图标向左
        width = 23
        isCollapseRight.value = true
      } else {
    
    
        // 当拉伸宽度为大于23且小于600，是否收起图标向右
        isCollapseRight.value = false
      }
      rightArea.style.width = width + 'px'
    }

    // 鼠标松开事件
    document.onmouseup = function (evt) {
    
    
      // 颜色恢复
      rightResizeBar.style.backgroundColor = "#ffffff"
      rightResizeBar.style.color = "#40485c"

      document.onmousemove = null
      document.onmouseup = null
      rightResizeBar.releaseCapture && rightResizeBar.releaseCapture();
    }

    rightResizeBar.setCapture && rightResizeBar.setCapture();
    return false
  }
}

onMounted(() => {
    
    
  handleDragLeftResizeBar()
  handleDragRightResizeBar()
})

onUnmounted(() => {
    
    
  // ...
})
</script>

<style lang="less" scoped>
  .index {
    
    
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow: hidden;

    /* ---- ^ 左边 ---- */
    :deep(.index-left) {
    
    
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: row;
      width: 400px;
      border-right: 1px solid #dcdfe6;

      // ^ 左侧区域
      .left-area-box {
    
    
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: #f8f8f8;
      }
      // / 左侧区域

      // ^ 是否收起左侧边栏的图标
      .left-view-more {
    
    
        position: relative;
        width: 15px;
        height: 100%;
        background-color: #f3f6f8;
        border-left: 1px solid #dcdfe6;

        .left-view-more-content {
    
    
          width: 12px;
          height: 30px;
          background-color: #ccc;
          border-bottom-right-radius: 4px;
          border-top-right-radius: 4px;
          position: absolute;
          display: block;
          margin: auto;
          left: 0;
          top: 0;
          bottom: 0;
          cursor: pointer;
          z-index: 1;
          transition: all ease 0.3s;

          &:hover {
    
    
            background-color: #5e7ce0;
          }

          .left-view-more-true {
    
    
            width: 100%;
            height: 10px;
            position: absolute;
            display: block;
            margin: auto;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;

            &::before {
    
    
              display: block;
              height: 2px;
              width: 10px;
              content: "";
              position: absolute;
              left: 0;
              top: 0;
              background-color: #fff;
              transform: rotate(70deg);
            }

            &::after {
    
    
              display: block;
              height: 2px;
              width: 10px;
              content: "";
              position: absolute;
              left: 0;
              bottom: 0;
              background-color: #fff;
              transform: rotate(-70deg);
            }
          }

          .left-view-more-false {
    
    
            width: 100%;
            height: 10px;
            position: absolute;
            display: block;
            margin: auto;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;

            &::before {
    
    
              display: block;
              height: 2px;
              width: 10px;
              content: "";
              position: absolute;
              left: 0;
              top: 0;
              background-color: #fff;
              transform: rotate(-70deg);
            }

            &::after {
    
    
              display: block;
              height: 2px;
              width: 10px;
              content: "";
              position: absolute;
              left: 0;
              bottom: 0;
              background-color: #fff;
              transform: rotate(70deg);
            }
          }
        }
      }
      // / 是否收起左侧边栏的图标

      // ^ 左侧拖动条
      .left-resize-bar {
    
    
        display: flex;
        align-items: center;
        width: 7px;
        height: 100%;
        background-color: rgb(255, 255, 255);
        cursor: col-resize;
        user-select: none;
        transition: all ease 0.3s;
        font-size: 20px;
        color: #40485c;

        &:hover {
    
    
          color: #fff !important;
          background-color: #5e7ce0 !important;
        }
      }
      // / 左侧拖动条
    }
    /* ---- / 左边 ---- */

    /* ---- ^ 中间 ---- */
    :deep(.index-middle) {
    
    
      position: relative;
      z-index: 1;
      flex: 1;
      overflow: hidden;
      position: relative;
      transition: all ease 0.3s;
      background-color: #f3f6f8;

      // ^ 中间区域
      .middle-area-box {
    
    
        display: flex;
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;

        .middle-area-box_main {
    
    
          position: relative;
          flex: 1 1;
          display: flex;
          flex-direction: column;
          width: 100%;

          .middle-area-box_main_up {
    
    
            flex: 1;
            display: flex;
            overflow: hidden;
            flex-direction: column;
            background-color: #fff;

            .middle-area-box_main_up_wrapper {
    
    
              flex: 1;
              display: flex;
              flex-direction: column;
              padding: 7px;
              overflow: auto;

              .index-tools-container {
    
    
                .tools-left {
    
    
                  flex: 1;
                }
                .tools-right {
    
    
                  height: auto;
                }
              }

              .index-table-container {
    
    
                flex: 1;
                overflow: auto;
              }

              .el-table {
    
    

                th .cell {
    
    
                  padding: 2.5px;
                  font-weight: normal;
                  font-size: 13px;
                }

                td .cell {
    
    
                  padding: 2.5px 0;
                  color: #000;
                  font-size: 13px;
                }

                .el-table__cell {
    
    
                  padding: 0;
                }

                /* ^ 表格复选框 */
                .el-table-column--selection {
    
    

                  .cell {
    
    
                    width: 100%;
                    display: block;

                    .el-checkbox {
    
    

                      .el-checkbox__inner {
    
    
                        transform: scale(1.2);
                        border-radius: 50%;
                        border: 1px solid #bbb;
                      }

                      .el-checkbox__input.is-checked .el-checkbox__inner,
                      .el-checkbox__input.is-indeterminate .el-checkbox__inner {
    
    
                        border: 1px solid #5e7ce0;
                      }
                    }
                  }
                }
                /* / 表格复选框 */
              }
            }
          }

          .middle-area-box_main_down {
    
    
            flex: 0;
          }
        }
      }
      // / 中间区域
    }
    /* ---- / 中间 ---- */

    /* ---- ^ 右边 ---- */
    :deep(.index-right) {
    
    
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: row;
      width: 400px;
      border-left: 1px solid #dcdfe6;

      // ^ 是否收起右侧边栏的图标
      .right-view-more {
    
    
        position: relative;
        width: 15px;
        height: 100%;
        background-color: #f3f6f8;
        border-right: 1px solid #dcdfe6;

        .right-view-more-content {
    
    
          width: 12px;
          height: 30px;
          background-color: #ccc;
          border-bottom-left-radius: 4px;
          border-top-left-radius: 4px;
          position: absolute;
          display: block;
          margin: auto;
          right: 0;
          top: 0;
          bottom: 0;
          cursor: pointer;
          z-index: 1;
          transition: all ease 0.3s;

          &:hover {
    
    
            background-color: #5e7ce0;
          }

          .right-view-more-true {
    
    
            width: 100%;
            height: 10px;
            position: absolute;
            display: block;
            margin: auto;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;

            &::before {
    
    
              display: block;
              height: 2px;
              width: 10px;
              content: "";
              position: absolute;
              left: 0;
              top: 0;
              background-color: #fff;
              transform: rotate(-70deg);
            }

            &::after {
    
    
              display: block;
              height: 2px;
              width: 10px;
              content: "";
              position: absolute;
              left: 0;
              bottom: 0;
              background-color: #fff;
              transform: rotate(70deg);
            }
          }

          .right-view-more-false {
    
    
            width: 100%;
            height: 10px;
            position: absolute;
            display: block;
            margin: auto;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;

            &::before {
    
    
              display: block;
              height: 2px;
              width: 10px;
              content: "";
              position: absolute;
              right: 0;
              top: 0;
              background-color: #fff;
              transform: rotate(70deg);
            }

            &::after {
    
    
              display: block;
              height: 2px;
              width: 10px;
              content: "";
              position: absolute;
              right: 0;
              bottom: 0;
              background-color: #fff;
              transform: rotate(-70deg);
            }
          }
        }
      }
      // / 是否收起右侧边栏的图标

      // ^ 右侧拖动条
      .right-resize-bar {
    
    
        position: relative;
        display: flex;
        align-items: center;
        width: 7px;
        height: 100%;
        background-color: rgb(255, 255, 255);
        cursor: col-resize;
        user-select: none;
        transition: all ease 0.3s;
        font-size: 20px;
        color: #40485c;

        &:hover {
    
    
          color: #fff !important;
          background-color: #5e7ce0 !important;
        }
      }
      // / 右侧拖动条

      // ^ 右侧区域
      .right-area-box {
    
    
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: #f8f8f8;
      }
      // / 右侧区域
    }
    /* ---- / 右边 ---- */
  }
</style>
