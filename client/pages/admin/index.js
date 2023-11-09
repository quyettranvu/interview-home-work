import Layout from "../../components/Layout";
import Link from "next/link";
import Admin from "../../components/auth/Admin";
import "bootstrap/dist/css/bootstrap.min.css";

const AdminIndex = () => {
  return (
    <Layout>
      <Admin>
        <div className="row">
          <div className="col-md-12 pt-5 pb-5">
            <h2>Admin Dashboard</h2>
          </div>
          <div className="col-md-4">
            <ul className="list-group">
              <li className="list-group-item">
                <Link href="/admin/crud/category-tag">
                  <a>Create Category</a>
                </Link>
              </li>
              <li className="list-group-item">
                <a href="/admin/crud/blog">Create Blog Post</a>
              </li>

              <li className="list-group-item">
                <Link href="/admin/crud/blogs">
                  <a>Update/Delete Blog</a>
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-md-8">right</div>
        </div>
      </Admin>
    </Layout>
  );
};

export default AdminIndex;