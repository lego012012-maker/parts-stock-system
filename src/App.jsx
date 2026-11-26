import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function App() {
  const [parts, setParts] = useState([]);

  const [partNo, setPartNo] = useState("");
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [ncdrNo, setNcdrNo] = useState("");

  const [searchPartNo, setSearchPartNo] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [totalQty, setTotalQty] = useState(0);

  const [processPartName, setProcessPartName] = useState("");
  const [actionType, setActionType] = useState("IN");
  const [processPartNo, setProcessPartNo] = useState("");
  const [processQty, setProcessQty] = useState("");
  const [processLocation, setProcessLocation] = useState("");
  
  const [moveToLocation, setMoveToLocation] = useState("");

  const locations = [
    "JIG ROOM",
    "PTK-A01",
    "PTK-A02",
    "PTK-B01",
    "PTK-B02",
    "HWA-A01",
    "HWA-A02",
    "ENGINEER",
    "VENDOR",
    "NCDR HOLD",
    "SCRAP"
  ];

  useEffect(() => {
    fetchParts();
  }, []);

  async function fetchParts() {
    const { data, error } = await supabase
      .from("parts")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setParts(data);
  }

  async function addPart() {
    if (
      !partNo ||
      !partName ||
      !quantity ||
      !location
    ) {
      alert("필수 항목을 모두 입력하세요.");
      return;
    }

    const { error } = await supabase
      .from("parts")
      .insert([
        {
          part_no: partNo,
          part_name: partName,
          quantity: Number(quantity),
          location: location,
          invoice_no: invoiceNo,
          ncdr_no: ncdrNo
        }
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setPartNo("");
    setPartName("");
    setQuantity("");
    setLocation("");
    setInvoiceNo("");
    setNcdrNo("");

    fetchParts();
  }

  async function searchPart() {

    if (!searchPartNo) {
      alert("Part No를 입력하세요.");
      return;
    }

    const { data, error } = await supabase
      .from("parts")
      .select("*")
      .eq("part_no", searchPartNo);

    if (error) {
      console.error(error);
      return;
    }

    setSearchResult(data);

    const total = data.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    setTotalQty(total);
  }

async function processStock() {

  if (
    !processPartNo ||
    !processQty ||
    !processLocation
  ) {
    alert("필수 항목을 입력하세요.");
    return;
  }

  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .eq("part_no", processPartNo)
    .eq("location", processLocation);

  if (error) {
    alert(error.message);
    return;
  }

  // ========================
  // 입고(IN)
  // ========================

  if (actionType === "IN") {

    // 신규 Location

    if (data.length === 0) {

      const { error: insertError } =
        await supabase
          .from("parts")
          .insert([
            {
              part_no: processPartNo,
              part_name: processPartName,
              quantity: Number(processQty),
              location: processLocation,
              invoice_no: "",
              ncdr_no: ""
            }
          ]);

      if (insertError) {
        alert(insertError.message);
        return;
      }

      alert("신규 Location 입고 완료");

      fetchParts();

      return;
    }

    // 기존 Location

    const target = data[0];

    const newQty =
      target.quantity +
      Number(processQty);

    const { error: updateError } =
      await supabase
        .from("parts")
        .update({
          quantity: newQty
        })
        .eq("id", target.id);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    alert("입고 완료");

    fetchParts();

    return;
  }
  
// ========================
// 이동(MOVE)
// ========================

if (actionType === "MOVE") {

  if (!moveToLocation) {
    alert("이동 위치를 선택하세요.");
    return;
  }

  if (
    moveToLocation ===
    processLocation
  ) {
    alert(
      "같은 위치로 이동할 수 없습니다."
    );
    return;
  }

  if (data.length === 0) {
    alert(
      "원본 재고를 찾을 수 없습니다."
    );
    return;
  }

  const source = data[0];

  if (
    source.quantity <
    Number(processQty)
  ) {
    alert(
      "이동 수량이 재고보다 많습니다."
    );
    return;
  }

  // 출발지 차감

  await supabase
    .from("parts")
    .update({
      quantity:
        source.quantity -
        Number(processQty)
    })
    .eq("id", source.id);

  // 도착지 재고 확인

  const {
    data: targetData,
    error: targetError
  } = await supabase
    .from("parts")
    .select("*")
    .eq(
      "part_no",
      processPartNo
    )
    .eq(
      "location",
      moveToLocation
    );

  if (targetError) {
    alert(targetError.message);
    return;
  }

  // 도착지 신규 생성

  if (targetData.length === 0) {

    const {
      error: insertError
    } = await supabase
      .from("parts")
      .insert([
        {
          part_no:
            processPartNo,
          part_name:
            source.part_name,
          quantity:
            Number(processQty),
          location:
            moveToLocation,
          invoice_no:
            source.invoice_no,
          ncdr_no:
            source.ncdr_no
        }
      ]);

    if (insertError) {
      alert(insertError.message);
      return;
    }

  } else {

    const destination =
      targetData[0];

    const {
      error: updateError
    } = await supabase
      .from("parts")
      .update({
        quantity:
          destination.quantity +
          Number(processQty)
      })
      .eq(
        "id",
        destination.id
      );

    if (updateError) {
      alert(updateError.message);
      return;
    }
  }

  alert("이동 완료");

  setProcessPartNo("");
  setProcessPartName("");
  setProcessQty("");
  setProcessLocation("");
  setMoveToLocation("");
  setActionType("IN");

  fetchParts();

  if (
    searchPartNo ===
    processPartNo
  ) {
    searchPart();
  }

  return;
}
  // ========================
  // 출고(OUT)
  // ========================

  if (data.length === 0) {
    alert("재고를 찾을 수 없습니다.");
    return;
  }

  const target = data[0];

  if (
    target.quantity <
    Number(processQty)
  ) {
    alert(
      "출고 수량이 현재 재고보다 많습니다."
    );
    return;
  }

  const newQty =
    target.quantity -
    Number(processQty);

  const { error: updateError } =
    await supabase
      .from("parts")
      .update({
        quantity: newQty
      })
      .eq("id", target.id);

  if (updateError) {
    alert(updateError.message);
    return;
  }

  alert("출고 완료");

setProcessPartNo("");
setProcessPartName("");
setProcessQty("");
setProcessLocation("");
setActionType("IN");

  fetchParts();

  if (
    searchPartNo === target.part_no
  ) {
    searchPart();
  }
}

  return (
    <div style={{ padding: "20px" }}>
      <h1>Parts Stock System V2.1</h1>

      <h2>부품 등록</h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "400px"
        }}
      >
        <input
          placeholder="Part No"
          value={partNo}
          onChange={(e) => setPartNo(e.target.value)}
        />

        <input
          placeholder="Part Name"
          value={partName}
          onChange={(e) => setPartName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="">
            Select Location
          </option>

          {locations.map((loc) => (
            <option
              key={loc}
              value={loc}
            >
              {loc}
            </option>
          ))}
        </select>

        <input
          placeholder="Invoice No"
          value={invoiceNo}
          onChange={(e) =>
            setInvoiceNo(e.target.value)
          }
        />

        <input
          placeholder="NCDR No"
          value={ncdrNo}
          onChange={(e) =>
            setNcdrNo(e.target.value)
          }
        />

        <button onClick={addPart}>
          등록
        </button>
      </div>

      <hr
        style={{
          marginTop: "30px",
          marginBottom: "30px"
        }}
      />

      <h2>재고 검색</h2>

      <input
        placeholder="Part No 입력"
        value={searchPartNo}
        onChange={(e) =>
          setSearchPartNo(e.target.value)
        }
      />

      <button
        onClick={searchPart}
        style={{ marginLeft: "10px" }}
      >
        검색
      </button>

      {searchResult.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            marginBottom: "20px"
          }}
        >
          <h3>
            총 재고 : {totalQty} EA
          </h3>

          <table
            border="1"
            cellPadding="10"
          >
            <thead>
              <tr>
                <th>Location</th>
                <th>Qty</th>
                <th>Invoice</th>
                <th>NCDR</th>
              </tr>
            </thead>

            <tbody>
              {searchResult.map((item) => (
                <tr key={item.id}>
                  <td>{item.location}</td>
                  <td>{item.quantity}</td>
                  <td>{item.invoice_no}</td>
                  <td>{item.ncdr_no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
)}

<hr />

<h2>입고 / 출고 처리</h2>

<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxWidth: "400px"
  }}
>

  <select
    value={actionType}
    onChange={(e) =>
      setActionType(e.target.value)
    }
  >
    <option value="IN">
      입고 (IN)
    </option>

    <option value="OUT">
      출고 (OUT)
    </option>

    <option value="MOVE">
  이동 (MOVE)
</option>
  </select>

  <input
    placeholder="Part No"
    value={processPartNo}
    onChange={(e) =>
      setProcessPartNo(e.target.value)
    }
  />

  <input
    placeholder="Part Name (신규 Location 입고 시)"
    value={processPartName}
    onChange={(e) =>
      setProcessPartName(e.target.value)
    }
  />

  <select
    value={processLocation}
    onChange={(e) =>
      setProcessLocation(e.target.value)
    }
  >
    <option value="">
      Location 선택
    </option>

    {locations.map((loc) => (
      <option
        key={loc}
        value={loc}
      >
        {loc}
      </option>
    ))}
  </select>


 {actionType === "MOVE" && (

  <select
    value={moveToLocation}
    onChange={(e) =>
      setMoveToLocation(
        e.target.value
      )
    }
  >

    <option value="">
      이동 위치 선택
    </option>

    {locations.map((loc) => (
      <option
        key={loc}
        value={loc}
      >
        {loc}
      </option>
    ))}

  </select>

)}

<input
  type="number"
  placeholder="수량"
  value={processQty}
  onChange={(e) =>
    setProcessQty(e.target.value)
  }
/>

  <button
    onClick={processStock}
  >
    처리
  </button>

</div>

<hr />

<h2>현재 재고</h2>

      <table
        border="1"
        cellPadding="10"
      >
        <thead>
          <tr>
            <th>Part No</th>
            <th>Part Name</th>
            <th>Qty</th>
            <th>Location</th>
            <th>Invoice No</th>
            <th>NCDR No</th>
          </tr>
        </thead>

        <tbody>
          {parts.map((part) => (
            <tr key={part.id}>
              <td>{part.part_no}</td>
              <td>{part.part_name}</td>
              <td>{part.quantity}</td>
              <td>{part.location}</td>
              <td>{part.invoice_no}</td>
              <td>{part.ncdr_no}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;