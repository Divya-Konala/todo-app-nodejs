let skip=0;
document.addEventListener("click", async function (event) {
  // event.preventDefault();
  if (event.target.classList.contains("add_item")) {
    const todoText = document.getElementById("create_field");
    if (!todoText.value) {
      alert("please add todo to add to the list");
      return;
    }
    axios
      .post("/create-item", { todo: todoText.value })
      .then((res) => {
        console.log(res);
        if (res.data.status == 201) {
          todoText.value = "";
        } else {
          alert(res.data.message);
        }
      })
      .catch((error) => {
        alert(error);
      });
  } else if (event.target.classList.contains("edit-me")) {
    const id = event.target.getAttribute("data-id");
    const newData = prompt("Enter Your new todo text");
    axios
      .post("/edit-item", { newData, id })
      .then((res) => {
        if (res.data.status == 200) {
          event.target.parentElement.parentElement.querySelector(
            ".item-text"
          ).textContent = newData;
        } else {
          alert(res.data.message);
        }
      })
      .catch((error) => {
        alert(error);
      });
  } else if (event.target.classList.contains("delete-me")) {
    let id = event.target.getAttribute("data-id");
    axios
      .post("/delete-item", { id })
      .then((res) => {
        if (res.data.status == 200) {
          event.target.parentElement.parentElement.remove();
        } else {
          alert(res.data.message);
        }
      })
      .catch((error) => {
        alert(error);
      });
  }else if(event.target.classList.contains("show_more")){
    generateTodos();
  }
});

window.onload = function () {
  generateTodos();
};

function generateTodos() {
  //read todos
  axios
    .get(`/dashboard_pagination?skip=${skip}`)
    .then((res) => {
      if (res.data.status != 200) {
        alert(res.data.message);
        return;
      }
      const todos = res.data.data;

      document.getElementById("item_list").insertAdjacentHTML(
        "beforeend",
        todos
          .map((item) => {
            return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
            <span class="item-text"> ${item.todo}</span>
            <div>
            <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
            <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
        </div>
        </li>`;
          })
          .join("")
      );
      skip+=todos.length;
    })
    .catch((error) => {
      alert(error);
    });
  //map todos
}
